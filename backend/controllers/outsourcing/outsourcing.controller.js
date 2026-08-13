const crypto = require('crypto');
const { v2: cloudinary } = require('cloudinary');
const logger = require('../../utils/logger');
const User = require('../../models/auth/User');
const OutsourcingJob = require('../../models/outsourcing/OutsourcingJob');
const OutsourcingContract = require('../../models/outsourcing/OutsourcingContract');
const OutsourcingTimeLog = require('../../models/outsourcing/OutsourcingTimeLog');
const OutsourcingPayment = require('../../models/outsourcing/OutsourcingPayment');
const OutsourcingFreelancer = require('../../models/outsourcing/OutsourcingFreelancer');
const OutsourcingMilestone = require('../../models/outsourcing/OutsourcingMilestone');
const OutsourcingWorkSession = require('../../models/outsourcing/OutsourcingWorkSession');
const OutsourcingSupportTicket = require('../../models/outsourcing/OutsourcingSupportTicket');
const Notification = require('../../models/common/Notification');
const ActivityLog = require('../../models/auth/ActivityLog');
const { buildProjectAccessSummary } = require('../../utils/projectAccess');
const { ROLES, isValidRole } = require('../../config/roles');

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const ADMIN_ROLE = 'admin';

const PAYMENT_TYPES = ['hourly', 'daily', 'weekly', 'fixed'];
const JOB_STATUSES = ['pending', 'accepted', 'in_progress', 'completed', 'rejected'];

const isAdmin = (user) => user?.role === ADMIN_ROLE;
const isOutsourcingCoordinator = (user) => [ROLES.HR].includes(user?.role);

const canManageJob = (user, job) =>
  isAdmin(user) || (isOutsourcingCoordinator(user) && String(job?.createdBy) === String(user?._id));

const normalizeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeOutsourcingType = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (raw === 'freelancer') return 'freelancer';
  if (['third_party_worker', '3rd_party_worker', 'thirdpartyworker', 'third_party'].includes(raw)) {
    return 'third_party_worker';
  }
  return raw;
};

const isWorkerUser = (userDoc) => {
  const normalizedType = normalizeOutsourcingType(userDoc?.metadata?.outsourcingType);
  return userDoc?.role === ROLES.FREELANCER || normalizedType === 'third_party_worker' || normalizedType === 'freelancer';
};

const generateFreelancerId = () => {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FRL-${new Date().getFullYear()}-${suffix}`;
};

const normalizeObjectId = (value) => {
  const raw = String(value || '').trim();
  return raw || null;
};

const writeOutsourcingActivity = async (req, action, targetId, metadata = {}) => {
  try {
    await ActivityLog.create({
      actor: req.user?._id || req.user?.id,
      user: req.user?._id || req.user?.id,
      action,
      module: 'outsourcing',
      targetType: 'Outsourcing',
      targetId: String(targetId || ''),
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    logger.warn({ err: error, action }, 'Failed to write outsourcing activity');
  }
};

const notifyOutsourcingAdmins = async ({ title, message, type, metadata = {} }) => {
  const admins = await User.find({ role: ADMIN_ROLE }).select('_id department');
  if (!admins.length) return;

  await Notification.insertMany(
    admins.map((admin) => ({
      manager: admin._id,
      managerDepartment: admin.department || 'Administration',
      department: 'Outsourcing',
      title,
      message,
      type,
      metadata
    }))
  );
};

const appendContractRevision = ({ contract, actorId, changeSummary = '', terms = null, overrideFlags = null }) => {
  const nextVersion = Math.max(1, Number(contract.currentVersion || 1)) + (contract.revisions?.length ? 1 : 0);
  const snapshot = {
    version: nextVersion,
    terms: terms ?? contract.terms ?? '',
    changeSummary: changeSummary || '',
    ndaSigned: overrideFlags?.ndaSigned ?? contract.ndaSigned ?? false,
    agreementSigned: overrideFlags?.agreementSigned ?? contract.agreementSigned ?? false,
    paymentTermsAccepted: overrideFlags?.paymentTermsAccepted ?? contract.paymentTermsAccepted ?? false,
    signedAt: overrideFlags?.signedAt ?? contract.signedAt ?? null,
    editedBy: actorId || null,
    editedAt: new Date()
  };
  contract.currentVersion = snapshot.version;
  contract.revisions = Array.isArray(contract.revisions) ? [...contract.revisions, snapshot] : [snapshot];
  if (terms !== null) contract.terms = terms;
  return snapshot;
};

const getLatestWorkerSession = (workerId) =>
  OutsourcingWorkSession.findOne({ worker: workerId, status: { $in: ['active', 'paused'] } }).sort({ checkInAt: -1 });

const calculateSessionMetrics = (session, now = new Date()) => {
  if (!session) {
    return {
      elapsedMinutes: 0,
      activeMinutes: 0,
      idleMinutes: 0,
      billableHours: 0,
      nonBillableHours: 0,
      productivityScore: 0
    };
  }

  const totalElapsedMinutes = Math.max(0, Math.round((now.getTime() - new Date(session.checkInAt).getTime()) / 60000));
  const pausedMinutes = Math.max(0, Number(session.totalPausedMinutes || 0));
  const activeMinutes = Math.max(0, totalElapsedMinutes - pausedMinutes);
  const idleMinutes = session.status === 'paused' ? Math.max(0, Math.round((now.getTime() - new Date(session.pausedAt || session.lastStatusAt || session.checkInAt).getTime()) / 60000)) : 0;
  const billableHours = Number((activeMinutes / 60).toFixed(2));
  const nonBillableHours = Number((pausedMinutes / 60).toFixed(2));
  const productivityScore = totalElapsedMinutes ? Math.max(0, Math.min(100, Math.round((activeMinutes / totalElapsedMinutes) * 100))) : 0;

  return {
    elapsedMinutes: totalElapsedMinutes,
    activeMinutes,
    idleMinutes,
    billableHours,
    nonBillableHours,
    productivityScore
  };
};

const createOutsourcingUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, outsourcingType, role, department, skills, domain } = req.body || {};
    const normalizedType = normalizeOutsourcingType(outsourcingType);
    const requestedRole = String(role || ROLES.FREELANCER).trim();
    const requestedDepartment = String(department || 'External Workforce').trim();

    if (!email || !password || !firstName || !lastName || !outsourcingType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!['freelancer', 'third_party_worker'].includes(normalizedType)) {
      return res.status(400).json({ success: false, error: 'Invalid outsourcingType' });
    }

    if (!isValidRole(requestedRole) || ![ROLES.FREELANCER].includes(requestedRole)) {
      return res.status(400).json({ success: false, error: 'Invalid role for freelancer user' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ success: false, error: 'User with this email already exists' });
    }

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim(),
      role: requestedRole,
      department: requestedDepartment || 'External Workforce',
      metadata: {
        outsourcingType: normalizedType,
        workerClass: 'external_contractor',
        isInHouse: false,
        accessScope: 'project_only',
        contractLifecycle: 'invite_pending'
      }
    });

    const freelancer = await OutsourcingFreelancer.create({
      freelancerId: generateFreelancerId(),
      user: user._id,
      contactEmail: user.email,
      contactPhone: user.phone || '',
      skills: Array.isArray(skills) ? skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 30) : [],
      domain: String(domain || '').trim(),
      accessLevel: 'restricted',
      status: 'invited',
      lawValidated: false
    });

    return res.status(201).json({ success: true, data: { user: user.toSafeObject(), freelancer } });
  } catch (error) {
    logger.error({ err: error }, 'Create outsourcing user error');
    return res.status(500).json({ success: false, error: 'Failed to create outsourcing user', details: error.message });
  }
};

const listFreelancers = async (req, res) => {
  try {
    const [users, profiles] = await Promise.all([
      User.find({
        $or: [
          { role: ROLES.FREELANCER },
          { 'metadata.outsourcingType': { $in: ['freelancer', 'freelaner', 'third_party_worker', '3rd_party_worker', 'thirdpartyworker'] } }
        ]
      })
        .select('firstName lastName email phone role department isActive metadata')
        .sort({ createdAt: -1 }),
      OutsourcingFreelancer.find()
        .populate('assignedProjects', 'title status dueDate')
        .populate('contract', 'status lawStatus ndaSigned agreementSigned paymentTermsAccepted')
    ]);

    const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
    const rows = users.map((user) => {
      const userData = user.toObject();
      const profile = profileByUser.get(String(user._id));
      return {
        ...userData,
        user: userData,
        freelancerEntityId: profile?._id || null,
        freelancerId: profile?.freelancerId || '',
        skills: profile?.skills || [],
        domain: profile?.domain || '',
        assignedProjects: profile?.assignedProjects || [],
        contract: profile?.contract || null,
        status: profile?.status || (user.isActive ? 'active' : 'blocked'),
        lawValidated: Boolean(profile?.lawValidated)
      };
    });
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    logger.error({ err: error }, 'List freelancers error');
    return res.status(500).json({ success: false, error: 'Failed to fetch freelancers', details: error.message });
  }
};

const createJob = async (req, res) => {
  try {
    const { title, description, assignedFreelancerId, dueDate, priority, budgetAmount } = req.body || {};
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'title and description are required' });
    }

    let freelancer = null;
    const freelancerId = normalizeObjectId(assignedFreelancerId);
    if (freelancerId) {
      freelancer = await User.findById(freelancerId);
      if (!freelancer || !isWorkerUser(freelancer)) {
        return res.status(400).json({ success: false, error: 'Invalid assignedFreelancerId' });
      }
    }

    const job = await OutsourcingJob.create({
      title: title.trim(),
      description: description.trim(),
      assignedFreelancer: freelancer?._id || null,
      acceptanceStatus: freelancer ? 'pending' : 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      budgetAmount: normalizeNumber(budgetAmount),
      createdBy: req.user._id
    });
    if (freelancer) {
      await OutsourcingFreelancer.findOneAndUpdate(
        { user: freelancer._id },
        { $addToSet: { assignedProjects: job._id } }
      );
      await Notification.create({
        manager: freelancer._id,
        managerDepartment: freelancer.department || 'Outsourcing',
        department: 'Outsourcing',
        title: 'New Task Assigned',
        message: `You have a new outsourcing task: "${job.title}"`,
        type: 'outsourcing_job_assigned',
        metadata: { jobId: job._id, freelancerId: freelancer._id }
      });
    }
    await writeOutsourcingActivity(req, 'outsourcing.job_created', job._id, {
      assignedFreelancerId: freelancer?._id || null,
      priority: job.priority
    });

    return res.status(201).json({ success: true, data: job });
  } catch (error) {
    logger.error({ err: error }, 'Create outsourcing job error');
    return res.status(500).json({ success: false, error: 'Failed to create job', details: error.message });
  }
};

const assignJobToFreelancer = async (req, res) => {
  try {
    const { freelancerId } = req.body || {};
    if (!freelancerId) {
      return res.status(400).json({ success: false, error: 'freelancerId is required' });
    }
    const freelancer = await User.findById(freelancerId);
    if (!freelancer || !isWorkerUser(freelancer)) {
      return res.status(400).json({ success: false, error: 'Invalid freelancerId' });
    }
    const job = await OutsourcingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (!canManageJob(req.user, job)) {
      return res.status(403).json({ success: false, error: 'You can only assign jobs created by you' });
    }
    if (job.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Completed job cannot be reassigned' });
    }

    const previousFreelancerId = job.assignedFreelancer;
    job.assignedFreelancer = freelancer._id;
    job.acceptanceStatus = 'pending';
    if (job.status === 'accepted') job.status = 'pending';
    job.rejectionReason = '';
    job.rejectedAt = null;
    job.rejectedBy = null;
    await job.save();
    if (previousFreelancerId && String(previousFreelancerId) !== String(freelancer._id)) {
      await OutsourcingFreelancer.findOneAndUpdate(
        { user: previousFreelancerId },
        { $pull: { assignedProjects: job._id } }
      );
    }
    await OutsourcingFreelancer.findOneAndUpdate(
      { user: freelancer._id },
      { $addToSet: { assignedProjects: job._id } }
    );
    await writeOutsourcingActivity(req, 'outsourcing.job_assigned', job._id, {
      freelancerId: freelancer._id
    });
    await Notification.create({
      manager: freelancer._id,
      managerDepartment: freelancer.department || 'Outsourcing',
      department: 'Outsourcing',
      title: 'New Task Assigned',
      message: `You have a new outsourcing task: "${job.title}"`,
      type: 'outsourcing_job_assigned',
      metadata: { jobId: job._id, freelancerId: freelancer._id }
    });

    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    logger.error({ err: error }, 'Assign outsourcing job error');
    return res.status(500).json({ success: false, error: 'Failed to assign job', details: error.message });
  }
};

const listJobs = async (req, res) => {
  try {
    const { status } = req.query || {};
    const query = {};

    if (status && JOB_STATUSES.includes(status)) query.status = status;

    if (isOutsourcingCoordinator(req.user)) {
      query.createdBy = req.user._id;
    } else if (!isAdmin(req.user)) {
      const me = await User.findById(req.user._id);
      if (isWorkerUser(me)) {
        // Strict isolation: worker can only view jobs assigned to self.
        query.assignedFreelancer = req.user._id;
      }
    }

    const jobs = await OutsourcingJob.find(query)
      .populate('assignedFreelancer', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    logger.error({ err: error }, 'List outsourcing jobs error');
    return res.status(500).json({ success: false, error: 'Failed to fetch jobs', details: error.message });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!JOB_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const job = await OutsourcingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    if (!isAdmin(req.user)) {
      if (String(job.assignedFreelancer) !== String(req.user._id)) {
        return res.status(403).json({ success: false, error: 'Not allowed to update this job' });
      }
      if (!['in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Freelancer can set only in_progress or completed status' });
      }
      const contract = await OutsourcingContract.findOne({ job: job._id, freelancer: req.user._id, status: 'active' });
      if (!contract) {
        return res.status(400).json({ success: false, error: 'Active contract is required before updating job status' });
      }
    }

    job.status = status;
    await job.save();
    if (job.assignedFreelancer && req.user?.role === ADMIN_ROLE) {
      await Notification.create({
        manager: job.assignedFreelancer,
        managerDepartment: 'Outsourcing',
        department: 'Outsourcing',
        title: 'Task Status Updated',
        message: `Task "${job.title}" moved to ${status}.`,
        type: 'outsourcing_job_status_updated',
        metadata: { jobId: job._id, status }
      });
    }
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    logger.error({ err: error }, 'Update outsourcing job status error');
    return res.status(500).json({ success: false, error: 'Failed to update job status', details: error.message });
  }
};

const acceptJob = async (req, res) => {
  try {
    const actor = await User.findById(req.user._id).select('role metadata firstName lastName email');
    if (!actor || !isWorkerUser(actor)) {
      return res.status(403).json({ success: false, error: 'Only freelancers can accept jobs' });
    }

    const job = await OutsourcingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    // Admin must assign first. Worker can accept only own assigned job.
    if (!job.assignedFreelancer) {
      return res.status(403).json({ success: false, error: 'Job must be assigned by admin before acceptance' });
    }
    if (String(job.assignedFreelancer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Job is assigned to another freelancer' });
    }

    if (job.acceptanceStatus !== 'pending') {
      return res.status(409).json({ success: false, error: 'Only pending jobs can be accepted' });
    }

    job.assignedFreelancer = req.user._id;
    job.acceptanceStatus = 'accepted';
    job.acceptedAt = new Date();
    job.rejectionReason = '';
    job.rejectedAt = null;
    job.rejectedBy = null;
    job.status = 'accepted';
    await job.save();
    await writeOutsourcingActivity(req, 'outsourcing.job_accepted', job._id, {
      freelancerId: req.user._id
    });

    await notifyOutsourcingAdmins({
      title: 'Job Accepted',
      message: `${actor.firstName || ''} ${actor.lastName || ''}`.trim() + ` accepted job "${job.title}"`,
      type: 'outsourcing_job_accepted',
      metadata: { jobId: job._id, freelancerId: req.user._id }
    });
    await notifyOutsourcingAdmins({
      title: 'Legal Workflow Required',
      message: `Create and activate the agreement workflow for "${job.title}" before execution starts.`,
      type: 'outsourcing_legal_workflow',
      metadata: { jobId: job._id, freelancerId: req.user._id, step: 'legal_agreement' }
    });

    req.app.get('io')?.to('outsourcing:admins').emit('outsourcing:update', { type: 'job:accepted', data: { _id: job._id, freelancerId: req.user._id } });
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    logger.error({ err: error }, 'Accept outsourcing job error');
    return res.status(500).json({ success: false, error: 'Failed to accept job', details: error.message });
  }
};

const rejectJob = async (req, res) => {
  try {
    const actor = await User.findById(req.user._id).select('role metadata firstName lastName email');
    if (!actor || !isWorkerUser(actor)) {
      return res.status(403).json({ success: false, error: 'Only freelancers can reject jobs' });
    }

    const rejectionReason = String(req.body?.rejectionReason || '').trim();
    if (!rejectionReason) {
      return res.status(400).json({ success: false, error: 'rejectionReason is required' });
    }

    const job = await OutsourcingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (!job.assignedFreelancer) {
      return res.status(403).json({ success: false, error: 'Job must be assigned by admin before rejection' });
    }
    if (String(job.assignedFreelancer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Job is assigned to another freelancer' });
    }
    if (job.acceptanceStatus !== 'pending') {
      return res.status(409).json({ success: false, error: 'Only pending jobs can be rejected' });
    }

    job.acceptanceStatus = 'rejected';
    job.rejectionReason = rejectionReason;
    job.rejectedAt = new Date();
    job.rejectedBy = req.user._id;
    job.status = 'rejected';
    await job.save();

    await writeOutsourcingActivity(req, 'outsourcing.job_rejected', job._id, {
      freelancerId: req.user._id,
      rejectionReason
    });

    await notifyOutsourcingAdmins({
      title: 'Job Rejected',
      message: `${actor.firstName || ''} ${actor.lastName || ''}`.trim() + ` rejected job "${job.title}"`,
      type: 'outsourcing_job_rejected',
      metadata: { jobId: job._id, freelancerId: req.user._id, rejectionReason }
    });

    req.app.get('io')?.to('outsourcing:admins').emit('outsourcing:update', { type: 'job:rejected', data: { _id: job._id, freelancerId: req.user._id } });
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    logger.error({ err: error }, 'Reject outsourcing job error');
    return res.status(500).json({ success: false, error: 'Failed to reject job', details: error.message });
  }
};

const createContract = async (req, res) => {
  try {
    const { jobId, freelancerId, paymentType, rate, currency, escrowAmount, startDate, endDate, terms, ndaSigned, agreementSigned, paymentTermsAccepted } = req.body || {};
    if (!jobId || !freelancerId || !paymentType || rate === undefined) {
      return res.status(400).json({ success: false, error: 'jobId, freelancerId, paymentType and rate are required' });
    }

    if (!PAYMENT_TYPES.includes(paymentType)) {
      return res.status(400).json({ success: false, error: 'Invalid paymentType' });
    }

    const job = await OutsourcingJob.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.acceptanceStatus !== 'accepted') {
      return res.status(400).json({ success: false, error: 'Freelancer must accept the job before contract creation' });
    }

    const freelancer = await User.findById(freelancerId);
    if (!freelancer || !isWorkerUser(freelancer)) {
      return res.status(400).json({ success: false, error: 'Invalid freelancerId' });
    }

    const existing = await OutsourcingContract.findOne({ job: job._id });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Contract already exists for this job' });
    }

    job.assignedFreelancer = freelancer._id;
    await job.save();

    const contract = await OutsourcingContract.create({
      job: job._id,
      client: null,
      freelancer: freelancer._id,
      paymentType,
      rate: normalizeNumber(rate),
      currency: String(currency || 'INR').trim().toUpperCase() || 'INR',
      escrowAmount: normalizeNumber(escrowAmount),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      terms: terms?.trim() || '',
      status: 'draft',
      lawStatus: 'pending',
      ndaSigned: Boolean(ndaSigned),
      agreementSigned: Boolean(agreementSigned),
      paymentTermsAccepted: Boolean(paymentTermsAccepted),
      signedAt: ndaSigned && agreementSigned && paymentTermsAccepted ? new Date() : null,
      currentVersion: 1,
      revisions: [],
      createdBy: req.user._id
    });

    appendContractRevision({
      contract,
      actorId: req.user._id,
      changeSummary: 'Initial agreement draft created',
      terms: contract.terms,
      overrideFlags: {
        ndaSigned: contract.ndaSigned,
        agreementSigned: contract.agreementSigned,
        paymentTermsAccepted: contract.paymentTermsAccepted,
        signedAt: contract.signedAt
      }
    });
    await contract.save();

    await OutsourcingFreelancer.findOneAndUpdate(
      { user: freelancer._id },
      { $set: { contract: contract._id }, $addToSet: { assignedProjects: job._id } }
    );
    await writeOutsourcingActivity(req, 'outsourcing.contract_created', contract._id, {
      jobId: job._id,
      freelancerId: freelancer._id,
      paymentType
    });
    await notifyOutsourcingAdmins({
      title: 'Agreement Draft Ready',
      message: `Legal review is required for "${job.title}" before work execution can begin.`,
      type: 'outsourcing_contract_draft',
      metadata: { jobId: job._id, contractId: contract._id, freelancerId: freelancer._id }
    });
    await Notification.create({
      manager: freelancer._id,
      managerDepartment: freelancer.department || 'Outsourcing',
      department: 'Outsourcing',
      title: 'Agreement Draft Created',
      message: `Your agreement draft is ready for "${job.title}".`,
      type: 'outsourcing_contract_created',
      metadata: { jobId: job._id, contractId: contract._id }
    });

    return res.status(201).json({ success: true, data: contract });
  } catch (error) {
    logger.error({ err: error }, 'Create outsourcing contract error');
    return res.status(500).json({ success: false, error: 'Failed to create contract', details: error.message });
  }
};

const updateContractTerms = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { terms, changeSummary } = req.body || {};
    const contract = await OutsourcingContract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

    if (!['draft', 'rejected'].includes(contract.status) && contract.lawStatus !== 'rejected') {
      return res.status(400).json({ success: false, error: 'Only draft or rejected agreements can be edited' });
    }

    const nextTerms = String(terms || '').trim();
    if (!nextTerms) {
      return res.status(400).json({ success: false, error: 'terms are required' });
    }

    appendContractRevision({
      contract,
      actorId: req.user._id,
      changeSummary: String(changeSummary || 'Contract terms updated').trim(),
      terms: nextTerms
    });

    contract.status = 'draft';
    contract.lawStatus = 'pending';
    contract.signedAt = null;
    await contract.save();

    await writeOutsourcingActivity(req, 'outsourcing.contract_updated', contract._id, {
      contractId: contract._id,
      jobId: contract.job,
      revision: contract.currentVersion
    });

    await notifyOutsourcingAdmins({
      title: 'Agreement Draft Updated',
      message: `Agreement terms for job "${contract.job}" were updated and are ready for legal review.`,
      type: 'outsourcing_contract_updated',
      metadata: { contractId: contract._id, jobId: contract.job, revision: contract.currentVersion }
    });

    return res.status(200).json({ success: true, data: contract });
  } catch (error) {
    logger.error({ err: error }, 'Update outsourcing contract error');
    return res.status(500).json({ success: false, error: 'Failed to update contract terms', details: error.message });
  }
};

const getContractHistory = async (req, res) => {
  try {
    const contract = await OutsourcingContract.findById(req.params.contractId)
      .populate('revisions.editedBy', 'firstName lastName email role')
      .populate('job', 'title')
      .populate('freelancer', 'firstName lastName email');
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

    return res.status(200).json({
      success: true,
      data: {
        contractId: contract._id,
        currentVersion: contract.currentVersion || 1,
        status: contract.status,
        lawStatus: contract.lawStatus,
        signedAt: contract.signedAt,
        revisions: contract.revisions || [],
        current: contract
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing contract history error');
    return res.status(500).json({ success: false, error: 'Failed to fetch contract history', details: error.message });
  }
};

const validateContractByLaw = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { approved } = req.body || {};
    const contract = await OutsourcingContract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

    if (!contract.ndaSigned || !contract.agreementSigned || !contract.paymentTermsAccepted) {
      contract.lawStatus = 'rejected';
      contract.status = 'draft';
      await contract.save();
      return res.status(400).json({ success: false, error: 'All legal signatures are required before LAW validation' });
    }

    contract.lawStatus = approved === false ? 'rejected' : 'validated';
    contract.status = approved === false ? 'draft' : 'active';
    await contract.save();

    await OutsourcingFreelancer.findOneAndUpdate(
      { user: contract.freelancer },
      {
        $set: {
          lawValidated: contract.lawStatus === 'validated',
          accessLevel: contract.lawStatus === 'validated' ? 'project_only' : 'restricted',
          status: contract.lawStatus === 'validated' ? 'active' : 'blocked'
        }
      }
    );

    await User.findByIdAndUpdate(contract.freelancer, {
      $set: {
        'metadata.contractLifecycle': contract.lawStatus === 'validated' ? 'law_approved' : 'law_rejected',
        'metadata.accessScope': contract.lawStatus === 'validated' ? 'project_only' : 'blocked'
      }
    });

    appendContractRevision({
      contract,
      actorId: req.user._id,
      changeSummary: contract.lawStatus === 'validated' ? 'Law approval granted' : 'Law approval rejected',
      overrideFlags: {
        ndaSigned: contract.ndaSigned,
        agreementSigned: contract.agreementSigned,
        paymentTermsAccepted: contract.paymentTermsAccepted,
        signedAt: contract.lawStatus === 'validated' ? new Date() : contract.signedAt
      }
    });
    if (contract.lawStatus === 'validated') {
      contract.signedAt = contract.signedAt || new Date();
    }
    await contract.save();

    await writeOutsourcingActivity(req, `outsourcing.contract_${contract.lawStatus}`, contract._id, {
      contractId: contract._id,
      jobId: contract.job,
      freelancerId: contract.freelancer
    });

    await notifyOutsourcingAdmins({
      title: contract.lawStatus === 'validated' ? 'Agreement Active' : 'Agreement Rejected',
      message: contract.lawStatus === 'validated'
        ? `Agreement for job "${contract.job}" is signed and active. Work execution can begin.`
        : `Agreement for job "${contract.job}" was rejected by legal review.`,
      type: contract.lawStatus === 'validated' ? 'outsourcing_contract_active' : 'outsourcing_contract_rejected',
      metadata: { contractId: contract._id, jobId: contract.job, freelancerId: contract.freelancer }
    });
    await Notification.create({
      manager: contract.freelancer,
      managerDepartment: 'Outsourcing',
      department: 'Outsourcing',
      title: contract.lawStatus === 'validated' ? 'Agreement Signed and Active' : 'Agreement Rejected',
      message: contract.lawStatus === 'validated'
        ? `Your agreement for job "${contract.job}" is signed and active.`
        : `Your agreement for job "${contract.job}" was rejected by legal review.`,
      type: contract.lawStatus === 'validated' ? 'outsourcing_contract_active' : 'outsourcing_contract_rejected',
      metadata: { contractId: contract._id, jobId: contract.job }
    });

    return res.status(200).json({ success: true, data: contract });
  } catch (error) {
    logger.error({ err: error }, 'LAW contract validation error');
    return res.status(500).json({ success: false, error: 'Failed to validate contract', details: error.message });
  }
};

const createMilestone = async (req, res) => {
  try {
    const { jobId, contractId, freelancerId, title, description, dueDate, amount } = req.body || {};
    if (!jobId || !contractId || !freelancerId || !title || amount === undefined) {
      return res.status(400).json({ success: false, error: 'jobId, contractId, freelancerId, title, amount are required' });
    }
    const contract = await OutsourcingContract.findById(contractId);
    if (!contract || contract.lawStatus !== 'validated' || contract.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Active LAW-validated contract required for milestone creation' });
    }

    const milestone = await OutsourcingMilestone.create({
      job: jobId,
      contract: contractId,
      freelancer: freelancerId,
      title: String(title).trim(),
      description: String(description || '').trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      amount: normalizeNumber(amount, 0),
      status: 'pending'
    });
    return res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    logger.error({ err: error }, 'Create milestone error');
    return res.status(500).json({ success: false, error: 'Failed to create milestone', details: error.message });
  }
};

const submitMilestone = async (req, res) => {
  try {
    const milestone = await OutsourcingMilestone.findById(req.params.id);
    if (!milestone) return res.status(404).json({ success: false, error: 'Milestone not found' });
    if (!isAdmin(req.user) && String(milestone.freelancer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Not allowed to submit this milestone' });
    }
    milestone.status = 'submitted';
    milestone.submittedAt = new Date();
    await milestone.save();
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    logger.error({ err: error }, 'Submit milestone error');
    return res.status(500).json({ success: false, error: 'Failed to submit milestone', details: error.message });
  }
};

const approveMilestone = async (req, res) => {
  try {
    const { approved } = req.body || {};
    const milestone = await OutsourcingMilestone.findById(req.params.id);
    if (!milestone) return res.status(404).json({ success: false, error: 'Milestone not found' });
    milestone.status = approved === false ? 'rejected' : 'approved';
    milestone.approvedAt = new Date();
    milestone.approvedBy = req.user._id;
    await milestone.save();
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    logger.error({ err: error }, 'Approve milestone error');
    return res.status(500).json({ success: false, error: 'Failed to approve milestone', details: error.message });
  }
};

const createMilestonePayment = async (req, res) => {
  try {
    const { milestoneId } = req.body || {};
    if (!milestoneId) return res.status(400).json({ success: false, error: 'milestoneId is required' });
    const milestone = await OutsourcingMilestone.findById(milestoneId);
    if (!milestone) return res.status(404).json({ success: false, error: 'Milestone not found' });
    if (milestone.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Milestone must be approved before payment request' });
    }
    const contract = await OutsourcingContract.findById(milestone.contract);
    if (!contract || contract.status !== 'active' || contract.lawStatus !== 'validated') {
      return res.status(400).json({ success: false, error: 'LAW-validated active contract required' });
    }

    const payment = await OutsourcingPayment.create({
      contract: milestone.contract,
      job: milestone.job,
      milestone: milestone._id,
      freelancer: milestone.freelancer,
      amount: milestone.amount,
      paymentType: 'freelancer_release',
      status: 'pending',
      approvedByAdmin: false,
      lawValidated: false
    });

    milestone.payment = payment._id;
    milestone.status = 'approved';
    await milestone.save();
    return res.status(201).json({ success: true, data: payment });
  } catch (error) {
    logger.error({ err: error }, 'Create milestone payment error');
    return res.status(500).json({ success: false, error: 'Failed to create milestone payment', details: error.message });
  }
};

const releaseMilestonePayment = async (req, res) => {
  try {
    const payment = await OutsourcingPayment.findById(req.params.id).populate('contract').populate('milestone');
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (!payment.milestone) return res.status(400).json({ success: false, error: 'Payment is not milestone linked' });
    if (payment.milestone.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Milestone must be approved before payment release' });
    }
    if (!payment.contract || payment.contract.status !== 'active' || payment.contract.lawStatus !== 'validated') {
      return res.status(400).json({ success: false, error: 'Active LAW-validated contract required before release' });
    }

    payment.approvedByAdmin = true;
    payment.lawValidated = true;
    payment.status = 'released';
    payment.releasedAt = new Date();
    await payment.save();

    await OutsourcingMilestone.findByIdAndUpdate(payment.milestone._id, { status: 'paid' });
    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    logger.error({ err: error }, 'Release milestone payment error');
    return res.status(500).json({ success: false, error: 'Failed to release milestone payment', details: error.message });
  }
};

const completeFreelancerLifecycle = async (req, res) => {
  try {
    const freelancer = await OutsourcingFreelancer.findById(req.params.id).populate('user contract');
    if (!freelancer) return res.status(404).json({ success: false, error: 'Freelancer not found' });

    freelancer.status = 'completed';
    freelancer.accessLevel = 'restricted';
    await freelancer.save();

    if (freelancer.contract) {
      await OutsourcingContract.findByIdAndUpdate(freelancer.contract._id, { status: 'completed' });
    }
    await User.findByIdAndUpdate(freelancer.user._id, {
      $set: { isActive: false, accountStatus: 'blocked', 'metadata.contractLifecycle': 'completed', 'metadata.accessScope': 'revoked' }
    });

    return res.status(200).json({ success: true, data: freelancer });
  } catch (error) {
    logger.error({ err: error }, 'Complete freelancer lifecycle error');
    return res.status(500).json({ success: false, error: 'Failed to complete freelancer lifecycle', details: error.message });
  }
};

const listContracts = async (req, res) => {
  try {
    const query = {};
    if (!isAdmin(req.user)) {
      const me = await User.findById(req.user._id);
      if (isWorkerUser(me)) query.freelancer = req.user._id;
    }
    const contracts = await OutsourcingContract.find(query)
      .populate('job', 'title status')
      .populate('createdBy', 'firstName lastName email')
      .populate('freelancer', 'firstName lastName email')
      .populate('revisions.editedBy', 'firstName lastName email role')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: contracts });
  } catch (error) {
    logger.error({ err: error }, 'List outsourcing contracts error');
    return res.status(500).json({ success: false, error: 'Failed to fetch contracts', details: error.message });
  }
};

const logTime = async (req, res) => {
  try {
    const { contractId, logDate, hours, note, workSummary, deliverableUrl, workStatus } = req.body || {};
    if (!contractId || !logDate || hours === undefined) {
      return res.status(400).json({ success: false, error: 'contractId, logDate and hours are required' });
    }

    const contract = await OutsourcingContract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });
    if (String(contract.freelancer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Only assigned worker can log time' });
    }
    if (contract.status !== 'active' || contract.lawStatus !== 'validated') {
      return res.status(400).json({ success: false, error: 'Signed and active contract is required to submit work log' });
    }
    const activeSession = await getLatestWorkerSession(req.user._id);
    if (activeSession) {
      return res.status(400).json({ success: false, error: 'Please stop the current work session before submitting a time log' });
    }
    const logDateObj = new Date(logDate);
    const duplicateLog = await OutsourcingTimeLog.findOne({
      contract: contract._id,
      freelancer: req.user._id,
      logDate: logDateObj
    });
    if (duplicateLog) {
      return res.status(409).json({ success: false, error: 'Time log already exists for this contract and date' });
    }

    const normalizedWorkStatus = ['in_progress', 'completed'].includes(workStatus) ? workStatus : 'in_progress';

    const timeLog = await OutsourcingTimeLog.create({
      contract: contract._id,
      job: contract.job,
      freelancer: req.user._id,
      logDate: logDateObj,
      hours: normalizeNumber(hours),
      workSummary: String(workSummary || '').trim(),
      deliverableUrl: String(deliverableUrl || '').trim(),
      workStatus: normalizedWorkStatus,
      note: note?.trim() || ''
    });
    await writeOutsourcingActivity(req, 'outsourcing.time_log_submitted', timeLog._id, {
      contractId: contract._id,
      jobId: contract.job,
      workStatus: normalizedWorkStatus
    });

    if (normalizedWorkStatus === 'completed') {
      await OutsourcingJob.findByIdAndUpdate(contract.job, { status: 'completed' });
    }

    await notifyOutsourcingAdmins({
      title: 'Work Log Submitted',
      message: `A new deliverable update was submitted for job "${contract.job}"`,
      type: 'outsourcing_time_log_submitted',
      metadata: { timeLogId: timeLog._id, contractId: contract._id, jobId: contract.job }
    });

    req.app.get('io')?.to('outsourcing:admins').emit('outsourcing:update', { type: 'timelog:new', data: { _id: timeLog._id, jobId: contract.job, freelancerId: req.user._id } });
    req.app.get('io')?.to(`outsourcing:user:${req.user._id}`).emit('outsourcing:update', { type: 'timelog:new' });
    return res.status(201).json({ success: true, data: timeLog });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing time log error');
    return res.status(500).json({ success: false, error: 'Failed to log time', details: error.message });
  }
};

const updateMyTimeLog = async (req, res) => {
  try {
    const log = await OutsourcingTimeLog.findOne({ _id: req.params.id, freelancer: req.user._id });
    if (!log) return res.status(404).json({ success: false, error: 'Time log not found' });
    if (log.verificationStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending logs can be edited' });
    }
    const { logDate, hours, workSummary, deliverableUrl, note, workStatus } = req.body || {};
    if (logDate) log.logDate = new Date(logDate);
    if (hours !== undefined) log.hours = normalizeNumber(hours);
    if (workSummary !== undefined) log.workSummary = String(workSummary).trim();
    if (deliverableUrl !== undefined) log.deliverableUrl = String(deliverableUrl).trim();
    if (note !== undefined) log.note = String(note).trim();
    if (workStatus && ['in_progress', 'completed'].includes(workStatus)) log.workStatus = workStatus;
    await log.save();
    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    logger.error({ err: error }, 'Update time log error');
    return res.status(500).json({ success: false, error: 'Failed to update log', details: error.message });
  }
};

const listTimeLogs = async (req, res) => {
  try {
    const query = {};
    if (isOutsourcingCoordinator(req.user)) {
      const managedJobIds = await OutsourcingJob.find({ createdBy: req.user._id }).distinct('_id');
      query.job = { $in: managedJobIds };
    } else if (!isAdmin(req.user)) {
      query.freelancer = req.user._id;
    }
    const rows = await OutsourcingTimeLog.find(query)
      .populate('contract', 'paymentType rate')
      .populate('job', 'title')
      .populate('freelancer', 'firstName lastName email')
      .sort({ logDate: -1 });
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    logger.error({ err: error }, 'List outsourcing time logs error');
    return res.status(500).json({ success: false, error: 'Failed to fetch time logs', details: error.message });
  }
};

const verifyTimeLog = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid verification status' });
    }
    const row = await OutsourcingTimeLog.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Time log not found' });
    if (isOutsourcingCoordinator(req.user)) {
      const managedJob = await OutsourcingJob.exists({ _id: row.job, createdBy: req.user._id });
      if (!managedJob) {
        return res.status(403).json({ success: false, error: 'You can only verify logs for jobs created by you' });
      }
    }

    row.verificationStatus = status;
    row.verifiedBy = req.user._id;
    row.verifiedAt = new Date();
    await row.save();
    await writeOutsourcingActivity(req, `outsourcing.time_log_${status}`, row._id, {
      jobId: row.job,
      freelancerId: row.freelancer
    });
    req.app.get('io')?.to(`outsourcing:user:${row.freelancer}`).emit('outsourcing:update', { type: `timelog:${status}`, data: { _id: row._id, status } });
    req.app.get('io')?.to('outsourcing:admins').emit('outsourcing:update', { type: `timelog:${status}`, data: { _id: row._id } });
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    logger.error({ err: error }, 'Verify outsourcing time log error');
    return res.status(500).json({ success: false, error: 'Failed to verify time log', details: error.message });
  }
};

const requestTimeLogRevision = async (req, res) => {
  try {
    const note = String(req.body?.note || '').trim();
    if (!note) {
      return res.status(400).json({ success: false, error: 'Revision note is required' });
    }
    const row = await OutsourcingTimeLog.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Time log not found' });

    row.verificationStatus = 'rejected';
    row.verifiedBy = req.user._id;
    row.verifiedAt = new Date();
    row.note = `${row.note ? `${row.note}\n` : ''}[Revision Requested] ${note}`.trim();
    await row.save();
    await OutsourcingJob.findByIdAndUpdate(row.job, { status: 'in_progress' });
    await writeOutsourcingActivity(req, 'outsourcing.time_log_revision_requested', row._id, {
      note,
      freelancerId: row.freelancer,
      jobId: row.job
    });

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    logger.error({ err: error }, 'Request outsourcing time log revision error');
    return res.status(500).json({ success: false, error: 'Failed to request revision', details: error.message });
  }
};

const createEscrowOrder = async (req, res) => {
  try {
    const { contractId, amount } = req.body || {};
    if (!contractId || amount === undefined) {
      return res.status(400).json({ success: false, error: 'contractId and amount are required' });
    }

    const contract = await OutsourcingContract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

    const payment = await OutsourcingPayment.create({
      contract: contract._id,
      job: contract.job,
      client: null,
      freelancer: contract.freelancer,
      amount: normalizeNumber(amount),
      paymentType: 'escrow_fund',
      status: 'created',
      providerOrderId: `order_${Date.now()}`
    });

    return res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        orderId: payment.providerOrderId,
        amount: payment.amount,
        currency: payment.currency,
        key: process.env.RAZORPAY_KEY_ID || null
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Create escrow order error');
    return res.status(500).json({ success: false, error: 'Failed to create escrow order', details: error.message });
  }
};

const verifyEscrowPayment = async (req, res) => {
  try {
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    if (!paymentId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Missing payment verification payload' });
    }

    const payment = await OutsourcingPayment.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'RAZORPAY_KEY_SECRET is not configured' });
    }

    const expected = crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
    if (expected !== razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    payment.providerOrderId = razorpayOrderId;
    payment.providerPaymentId = razorpayPaymentId;
    payment.providerSignature = razorpaySignature;
    payment.status = 'paid';
    await payment.save();

    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    logger.error({ err: error }, 'Verify escrow payment error');
    return res.status(500).json({ success: false, error: 'Failed to verify payment', details: error.message });
  }
};

const approveEscrowRelease = async (req, res) => {
  try {
    const payment = await OutsourcingPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    if (payment.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Escrow must be paid before approval' });
    }

    payment.approvedByAdmin = true;
    payment.approvedAt = new Date();
    payment.status = 'approved';
    await payment.save();

    const releasePayment = await OutsourcingPayment.create({
      contract: payment.contract,
      job: payment.job,
      client: null,
      freelancer: payment.freelancer,
      amount: payment.amount,
      paymentType: 'freelancer_release',
      status: 'released',
      approvedByAdmin: true,
      approvedAt: payment.approvedAt,
      releasedAt: new Date(),
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId
    });

    return res.status(200).json({ success: true, data: { escrow: payment, release: releasePayment } });
  } catch (error) {
    logger.error({ err: error }, 'Approve escrow release error');
    return res.status(500).json({ success: false, error: 'Failed to approve escrow release', details: error.message });
  }
};

const outsourcingDashboard = async (req, res) => {
  try {
    const now = new Date();
    const [totalUsers, freelancers, jobsByStatus, totalContracts, activeContracts, pendingTimeLogs, approvedTimeLogs, paymentSummary, recentJobs, recentTimeLogs, sessionSummary, agreementSummary, overdueTasks] =
      await Promise.all([
        User.countDocuments({ 'metadata.outsourcingType': 'freelancer' }),
        User.countDocuments({ 'metadata.outsourcingType': 'freelancer' }),
        OutsourcingJob.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        OutsourcingContract.countDocuments(),
        OutsourcingContract.countDocuments({ status: 'active' }),
        OutsourcingTimeLog.countDocuments({ verificationStatus: 'pending' }),
        OutsourcingTimeLog.countDocuments({ verificationStatus: 'approved' }),
        OutsourcingPayment.aggregate([
          { $match: { paymentType: 'escrow_fund', status: { $in: ['paid', 'approved'] } } },
          { $group: { _id: null, totalEscrowFunded: { $sum: '$amount' } } }
        ]),
        OutsourcingJob.find()
          .populate('assignedFreelancer', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .limit(10),
        OutsourcingTimeLog.find()
          .populate('job', 'title status')
          .populate('freelancer', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .limit(10),
        OutsourcingWorkSession.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        OutsourcingContract.aggregate([
          {
            $group: {
              _id: '$lawStatus',
              count: { $sum: 1 }
            }
          }
        ]),
        OutsourcingJob.countDocuments({ dueDate: { $lt: now }, status: { $ne: 'completed' } })
      ]);

    const sessionsByStatus = Object.fromEntries((sessionSummary || []).map((row) => [row._id, row.count]));
    const agreementsByStatus = Object.fromEntries((agreementSummary || []).map((row) => [row._id, row.count]));

    return res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, freelancers, workers: freelancers },
        jobsByStatus,
        contracts: { total: totalContracts, active: activeContracts },
        timeLogs: { pendingVerification: pendingTimeLogs, approved: approvedTimeLogs },
        payments: { totalEscrowFunded: paymentSummary[0]?.totalEscrowFunded || 0 },
        sessions: {
          active: sessionsByStatus.active || 0,
          paused: sessionsByStatus.paused || 0,
          closed: sessionsByStatus.closed || 0
        },
        agreements: {
          draft: agreementsByStatus.pending || 0,
          validated: agreementsByStatus.validated || 0,
          rejected: agreementsByStatus.rejected || 0,
          active: activeContracts,
          overdue: overdueTasks
        },
        operations: {
          pendingVerification: pendingTimeLogs,
          readyToInvoice: approvedTimeLogs,
          activeContracts,
          overdueTasks
        },
        recentJobs,
        recentTimeLogs
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing dashboard error');
    return res.status(500).json({ success: false, error: 'Failed to load outsourcing dashboard', details: error.message });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const query = isAdmin(req.user) ? {} : { freelancer: req.user._id };
    const rows = await OutsourcingPayment.find(query)
      .populate('contract', 'paymentType rate')
      .populate('job', 'title status')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing payments error');
    return res.status(500).json({ success: false, error: 'Failed to fetch payment history', details: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing profile error');
    return res.status(500).json({ success: false, error: 'Failed to fetch profile', details: error.message });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      title,
      bio,
      country,
      city,
      timezone,
      hourlyRate,
      availability,
      skills,
      paymentDetails,
      bankDetails,
      paymentInfo,
      entityType,
      businessName,
      website,
      foundedYear,
      teamSize,
      teamMembers
    } = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();
    if (phone !== undefined) user.phone = String(phone).trim();

    const currentMeta = user.metadata || {};
    const nextMeta = { ...currentMeta };
    if (title !== undefined) nextMeta.title = String(title).trim();
    if (bio !== undefined) nextMeta.bio = String(bio).trim();
    if (country !== undefined) nextMeta.country = String(country).trim();
    if (city !== undefined) nextMeta.city = String(city).trim();
    if (timezone !== undefined) nextMeta.timezone = String(timezone).trim();
    if (availability !== undefined) nextMeta.availability = String(availability).trim();
    if (hourlyRate !== undefined) nextMeta.hourlyRate = normalizeNumber(hourlyRate, 0);

    if (Array.isArray(skills)) {
      nextMeta.skills = skills
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 50);
    }

    // Individual / Team / Agency profile typing — additive, independent of
    // the fields above. `entityType` drives which sections the Outsourcing
    // profile page renders; unrecognized values fall back to 'individual'
    // rather than rejecting the save.
    if (entityType !== undefined) {
      const t = String(entityType).trim().toLowerCase();
      nextMeta.entityType = ['individual', 'team', 'agency'].includes(t) ? t : 'individual';
    }
    if (businessName !== undefined) nextMeta.businessName = String(businessName).trim();
    if (website !== undefined) nextMeta.website = String(website).trim();
    if (foundedYear !== undefined) nextMeta.foundedYear = normalizeNumber(foundedYear, undefined);
    if (teamSize !== undefined) nextMeta.teamSize = normalizeNumber(teamSize, undefined);
    if (Array.isArray(teamMembers)) {
      nextMeta.teamMembers = teamMembers
        .map((tm) => ({ name: String(tm?.name || '').trim(), role: String(tm?.role || '').trim() }))
        .filter((tm) => tm.name || tm.role)
        .slice(0, 50);
    }

    if (paymentDetails && typeof paymentDetails === 'object') {
      nextMeta.paymentDetails = {
        accountHolderName: String(paymentDetails.accountHolderName || '').trim(),
        bankName: String(paymentDetails.bankName || '').trim(),
        accountNumber: String(paymentDetails.accountNumber || '').trim(),
        ifscCode: String(paymentDetails.ifscCode || '').trim().toUpperCase(),
        accountType: String(paymentDetails.accountType || '').trim(),
        upiId: String(paymentDetails.upiId || '').trim(),
        paypalEmail: String(paymentDetails.paypalEmail || '').trim()
      };
    }
    if (bankDetails && typeof bankDetails === 'object') {
      nextMeta.bankDetails = {
        accountHolderName: String(bankDetails.accountHolderName || '').trim(),
        bankName: String(bankDetails.bankName || '').trim(),
        accountNumber: String(bankDetails.accountNumber || '').trim(),
        ifscCode: String(bankDetails.ifscCode || '').trim().toUpperCase(),
        accountType: String(bankDetails.accountType || '').trim(),
      };
    }
    if (paymentInfo && typeof paymentInfo === 'object') {
      nextMeta.paymentInfo = {
        upiId: String(paymentInfo.upiId || '').trim(),
        paypalEmail: String(paymentInfo.paypalEmail || '').trim(),
      };
    }

    // Hard lock protected identity fields even if sent by client.
    delete nextMeta.email;
    delete nextMeta.password;
    delete nextMeta.userId;
    user.metadata = nextMeta;

    if (!user.firstName || !user.lastName) {
      return res.status(400).json({ success: false, error: 'firstName and lastName are required' });
    }

    await user.save();
    return res.status(200).json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    logger.error({ err: error }, 'Update outsourcing profile error');
    return res.status(500).json({ success: false, error: 'Failed to update profile', details: error.message });
  }
};

const getMyActivityFeed = async (req, res) => {
  try {
    const activityQuery = isAdmin(req.user) ? { module: 'outsourcing' } : { module: 'outsourcing', user: req.user._id };
    const [sessions, logs, jobs, activities] = await Promise.all([
      OutsourcingWorkSession.find({ worker: req.user._id }).sort({ createdAt: -1 }).limit(10),
      OutsourcingTimeLog.find({ freelancer: req.user._id }).sort({ createdAt: -1 }).limit(10),
      OutsourcingJob.find({ assignedFreelancer: req.user._id }).sort({ updatedAt: -1 }).limit(10),
      ActivityLog.find(activityQuery).sort({ createdAt: -1 }).limit(20)
    ]);

    const events = [
      ...sessions.map((s) => ({
        type: 'session',
        title: s.status === 'active' ? 'Checked in' : s.status === 'paused' ? 'Paused work session' : 'Checked out',
        at: s.updatedAt || s.createdAt,
        meta: { sessionId: s._id, status: s.status, durationMinutes: s.durationMinutes || 0, pausedMinutes: s.totalPausedMinutes || 0 },
      })),
      ...logs.map((l) => ({
        type: 'time_log',
        title: 'Submitted time log',
        at: l.createdAt,
        meta: { timeLogId: l._id, hours: l.hours, status: l.verificationStatus },
      })),
      ...jobs.map((j) => ({
        type: 'job',
        title: `Job status: ${j.status}`,
        at: j.updatedAt || j.createdAt,
        meta: { jobId: j._id, jobTitle: j.title, status: j.status },
      })),
      ...activities.map((a) => ({
        type: 'activity',
        title: a.action.replace(/^outsourcing\./, '').replace(/_/g, ' '),
        at: a.createdAt,
        meta: { action: a.action, targetId: a.targetId, targetType: a.targetType }
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return res.status(200).json({ success: true, data: events.slice(0, 30) });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing activity feed error');
    return res.status(500).json({ success: false, error: 'Failed to fetch activity feed', details: error.message });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const rows = await Notification.find({
      $or: [{ recipient: req.user._id }, { manager: req.user._id }, { user: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing notifications error');
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications', details: error.message });
  }
};

const getMyWorkspace = async (req, res) => {
  try {
    const isAdminUser = isAdmin(req.user);
    const activityQuery = isAdminUser ? { module: 'outsourcing' } : { module: 'outsourcing', user: req.user._id };
    const projectAccess = buildProjectAccessSummary(req.user || {});
    const [jobs, contracts, sessions, notifications, activities, logs] = await Promise.all([
      OutsourcingJob.find(isAdminUser ? {} : { assignedFreelancer: req.user._id })
        .populate('assignedFreelancer', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email role')
        .sort({ updatedAt: -1 })
        .limit(25),
      OutsourcingContract.find(isAdminUser ? {} : { freelancer: req.user._id })
        .populate('job', 'title status dueDate')
        .populate('freelancer', 'firstName lastName email')
        .populate('revisions.editedBy', 'firstName lastName email role')
        .sort({ updatedAt: -1 })
        .limit(25),
      OutsourcingWorkSession.find(isAdminUser ? {} : { worker: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20),
      Notification.find({
        $or: isAdminUser ? [{ department: 'Outsourcing' }] : [{ recipient: req.user._id }, { manager: req.user._id }, { user: req.user._id }]
      })
        .sort({ createdAt: -1 })
        .limit(20),
      ActivityLog.find(activityQuery).sort({ createdAt: -1 }).limit(30),
      OutsourcingTimeLog.find(isAdminUser ? {} : { freelancer: req.user._id }).sort({ createdAt: -1 }).limit(20)
    ]);

    const activeContracts = contracts.filter((contract) => contract.status === 'active' && contract.lawStatus === 'validated');
    const activeSession = sessions.find((session) => session.status === 'active' || session.status === 'paused') || null;

    return res.status(200).json({
      success: true,
      data: {
        scope: isAdminUser ? 'enterprise' : 'assigned_only',
        assignedProjects: jobs,
        contracts,
        activeContracts,
        session: activeSession,
        notifications,
        activity: activities.map((entry) => ({
          _id: entry._id,
          action: entry.action,
          module: entry.module,
          targetType: entry.targetType,
          targetId: entry.targetId,
          createdAt: entry.createdAt,
          metadata: entry.metadata
        })),
        logs: logs.map((log) => ({
          _id: log._id,
          job: log.job,
          contract: log.contract,
          logDate: log.logDate,
          hours: log.hours,
          verificationStatus: log.verificationStatus
        })),
        summary: {
          projects: jobs.length,
          contracts: contracts.length,
          activeContracts: activeContracts.length,
          notifications: notifications.length,
          pendingLogs: logs.filter((log) => log.verificationStatus === 'pending').length,
          activeSession: Boolean(activeSession),
          projectAssignments: projectAccess.summary.assigned,
          projectAccessGranted: projectAccess.summary.accessible
        },
        projectAccess: {
          summary: projectAccess.summary,
          projects: projectAccess.projects
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing workspace error');
    return res.status(500).json({ success: false, error: 'Failed to fetch workspace', details: error.message });
  }
};

const checkIn = async (req, res) => {
  try {
    const actor = await User.findById(req.user._id).select('metadata');
    if (!isWorkerUser(actor) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only workers can check in' });
    }

    const existing = await getLatestWorkerSession(req.user._id);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Active or paused work session already exists', data: existing });
    }

    const { contractId, jobId, note } = req.body || {};
    let activeContract = null;
    if (contractId) {
      activeContract = await OutsourcingContract.findById(contractId);
      if (!activeContract || String(activeContract.freelancer) !== String(req.user._id) || activeContract.status !== 'active') {
        return res.status(400).json({ success: false, error: 'Valid active contract is required for check-in' });
      }
    } else {
      activeContract = await OutsourcingContract.findOne({ freelancer: req.user._id, status: 'active' }).sort({ createdAt: -1 });
      if (!activeContract) {
        return res.status(400).json({ success: false, error: 'No active contract found. Ask admin to create and activate contract first' });
      }
    }
    const targetJobId = jobId || activeContract.job || null;
    if (!targetJobId) {
      return res.status(400).json({ success: false, error: 'No job linked with active contract' });
    }
    const job = await OutsourcingJob.findById(targetJobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found for check-in' });
    }
    if (!['accepted', 'in_progress'].includes(job.status)) {
      return res.status(400).json({ success: false, error: 'Job is not ready for check-in' });
    }
    const now = new Date();
    const session = await OutsourcingWorkSession.create({
      worker: req.user._id,
      contract: activeContract._id,
      job: targetJobId,
      checkInAt: now,
      lastStatusAt: now,
      note: note?.trim() || '',
      status: 'active',
      totalPausedMinutes: 0
    });

    await writeOutsourcingActivity(req, 'outsourcing.session_checked_in', session._id, {
      jobId: targetJobId,
      contractId: activeContract._id
    });

    req.app.get('io')?.to('outsourcing:admins').emit('outsourcing:update', { type: 'session:checkin', data: { userId: req.user._id } });
    return res.status(201).json({ success: true, data: session });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing check-in error');
    return res.status(500).json({ success: false, error: 'Failed to check in', details: error.message });
  }
};

const checkOut = async (req, res) => {
  try {
    const actor = await User.findById(req.user._id).select('metadata');
    if (!isWorkerUser(actor) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only workers can check out' });
    }

    const active = await OutsourcingWorkSession.findOne({
      worker: req.user._id,
      status: { $in: ['active', 'paused'] }
    }).sort({ checkInAt: -1 });

    if (!active) {
      return res.status(404).json({ success: false, error: 'No active work session found' });
    }

    const outAt = new Date();
    const pausedMinutes = Math.max(0, Number(active.totalPausedMinutes || 0));
    const diffMs = outAt.getTime() - new Date(active.checkInAt).getTime();
    const durationMinutes = Math.max(0, Math.round(diffMs / 60000) - pausedMinutes);

    active.checkOutAt = outAt;
    active.durationMinutes = durationMinutes;
    active.status = 'closed';
    active.lastStatusAt = outAt;
    active.pausedAt = null;
    if (req.body?.note) active.note = String(req.body.note).trim();
    await active.save();

    await writeOutsourcingActivity(req, 'outsourcing.session_checked_out', active._id, {
      jobId: active.job,
      contractId: active.contract,
      durationMinutes
    });

    req.app.get('io')?.to('outsourcing:admins').emit('outsourcing:update', { type: 'session:checkout', data: { userId: req.user._id, durationMinutes } });
    return res.status(200).json({
      success: true,
      data: {
        ...active.toObject(),
        durationHours: Number((durationMinutes / 60).toFixed(2))
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing check-out error');
    return res.status(500).json({ success: false, error: 'Failed to check out', details: error.message });
  }
};

const pauseWorkSession = async (req, res) => {
  try {
    const actor = await User.findById(req.user._id).select('metadata');
    if (!isWorkerUser(actor) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only workers can pause work sessions' });
    }

    const active = await OutsourcingWorkSession.findOne({
      worker: req.user._id,
      status: 'active'
    }).sort({ checkInAt: -1 });
    if (!active) {
      return res.status(404).json({ success: false, error: 'No active session found to pause' });
    }

    const now = new Date();
    active.totalPausedMinutes = Math.max(0, Number(active.totalPausedMinutes || 0));
    active.pausedAt = now;
    active.lastStatusAt = now;
    active.status = 'paused';
    await active.save();

    await writeOutsourcingActivity(req, 'outsourcing.session_paused', active._id, {
      jobId: active.job,
      contractId: active.contract
    });

    return res.status(200).json({ success: true, data: active });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing pause session error');
    return res.status(500).json({ success: false, error: 'Failed to pause session', details: error.message });
  }
};

const resumeWorkSession = async (req, res) => {
  try {
    const actor = await User.findById(req.user._id).select('metadata');
    if (!isWorkerUser(actor) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only workers can resume work sessions' });
    }

    const paused = await OutsourcingWorkSession.findOne({
      worker: req.user._id,
      status: 'paused'
    }).sort({ checkInAt: -1 });
    if (!paused) {
      return res.status(404).json({ success: false, error: 'No paused session found to resume' });
    }

    const now = new Date();
    const pausedStart = paused.pausedAt || paused.lastStatusAt || paused.checkInAt;
    const pauseMinutes = Math.max(0, Math.round((now.getTime() - new Date(pausedStart).getTime()) / 60000));
    paused.totalPausedMinutes = Math.max(0, Number(paused.totalPausedMinutes || 0) + pauseMinutes);
    paused.pausedAt = null;
    paused.lastStatusAt = now;
    paused.status = 'active';
    await paused.save();

    await writeOutsourcingActivity(req, 'outsourcing.session_resumed', paused._id, {
      jobId: paused.job,
      contractId: paused.contract,
      pauseMinutes
    });

    return res.status(200).json({ success: true, data: paused });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing resume session error');
    return res.status(500).json({ success: false, error: 'Failed to resume session', details: error.message });
  }
};

const stopWorkSession = async (req, res) => {
  try {
    const actor = await User.findById(req.user._id).select('metadata');
    if (!isWorkerUser(actor) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only workers can stop work sessions' });
    }

    const active = await OutsourcingWorkSession.findOne({
      worker: req.user._id,
      status: { $in: ['active', 'paused'] }
    }).sort({ checkInAt: -1 });
    if (!active) {
      return res.status(404).json({ success: false, error: 'No active work session found' });
    }

    const now = new Date();
    const pausedMinutes = Math.max(0, Number(active.totalPausedMinutes || 0));
    const diffMs = now.getTime() - new Date(active.checkInAt).getTime();
    const durationMinutes = Math.max(0, Math.round(diffMs / 60000) - pausedMinutes);

    active.checkOutAt = now;
    active.durationMinutes = durationMinutes;
    active.status = 'closed';
    active.lastStatusAt = now;
    active.pausedAt = null;
    if (req.body?.note) active.note = String(req.body.note).trim();
    await active.save();

    await writeOutsourcingActivity(req, 'outsourcing.session_stopped', active._id, {
      jobId: active.job,
      contractId: active.contract,
      durationMinutes
    });

    return res.status(200).json({
      success: true,
      data: {
        ...active.toObject(),
        durationHours: Number((durationMinutes / 60).toFixed(2))
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing stop session error');
    return res.status(500).json({ success: false, error: 'Failed to stop session', details: error.message });
  }
};

const getMySessionStatus = async (req, res) => {
  try {
    const current = await OutsourcingWorkSession.findOne({
      worker: req.user._id,
      status: { $in: ['active', 'paused'] }
    }).sort({ checkInAt: -1 });

    const recent = await OutsourcingWorkSession.find({ worker: req.user._id })
      .sort({ checkInAt: -1 })
      .limit(20)
      .populate('job', 'title')
      .populate('contract', 'paymentType rate');

    return res.status(200).json({
      success: true,
      data: {
        isCheckedIn: Boolean(current),
        activeSession: current || null,
        currentSession: current || null,
        sessionMetrics: calculateSessionMetrics(current),
        sessions: recent.map((session) => ({
          ...session.toObject(),
          sessionMetrics: calculateSessionMetrics(session)
        }))
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing session status error');
    return res.status(500).json({ success: false, error: 'Failed to fetch session status', details: error.message });
  }
};

const getMyWorkflow = async (req, res) => {
  try {
    const freelancerId = req.user._id;
    const [jobs, contracts, activeSession, latestLog, approvedLog] = await Promise.all([
      OutsourcingJob.find({ assignedFreelancer: freelancerId }).sort({ updatedAt: -1 }).limit(50),
      OutsourcingContract.find({ freelancer: freelancerId }).sort({ updatedAt: -1 }).limit(50),
      OutsourcingWorkSession.findOne({ worker: freelancerId, status: { $in: ['active', 'paused'] } }).sort({ checkInAt: -1 }),
      OutsourcingTimeLog.findOne({ freelancer: freelancerId }).sort({ createdAt: -1 }),
      OutsourcingTimeLog.findOne({ freelancer: freelancerId, verificationStatus: 'approved' }).sort({ verifiedAt: -1 })
    ]);

    const hasAcceptedJob = jobs.some((j) => j.acceptanceStatus === 'accepted');
    const hasPendingAgreement = contracts.some((c) => c.status === 'draft' || c.lawStatus === 'pending');
    const hasValidatedContract = contracts.some((c) => c.status === 'active' && c.lawStatus === 'validated');
    const hasSubmittedLog = Boolean(latestLog);
    const hasApprovedLog = Boolean(approvedLog);

    let currentStep = 'accept_job';
    if (hasAcceptedJob) currentStep = hasPendingAgreement ? 'legal_agreement' : 'work_execution';
    if (hasValidatedContract) currentStep = 'check_in';
    if (activeSession?.status === 'paused') currentStep = 'resume_work';
    if (activeSession?.status === 'active') currentStep = 'stop_work';
    if (!activeSession && hasSubmittedLog) currentStep = 'await_verification';
    if (hasApprovedLog) currentStep = 'generate_invoice';

    return res.status(200).json({
      success: true,
      data: {
        currentStep,
        can: {
          acceptJob: jobs.some((j) => j.acceptanceStatus === 'pending'),
          rejectJob: jobs.some((j) => j.acceptanceStatus === 'pending'),
          legalAgreement: hasAcceptedJob && !hasValidatedContract,
          checkIn: hasValidatedContract && !activeSession,
          pauseWork: Boolean(activeSession && activeSession.status === 'active'),
          resumeWork: Boolean(activeSession && activeSession.status === 'paused'),
          stopWork: Boolean(activeSession),
          submitTimeLog: hasValidatedContract && !activeSession,
          generateInvoice: hasApprovedLog
        },
        summary: {
          jobsAssigned: jobs.length,
          contractsTotal: contracts.length,
          activeContracts: contracts.filter((c) => c.status === 'active').length,
          legalActive: contracts.filter((c) => c.status === 'active' && c.lawStatus === 'validated').length,
          checkedIn: Boolean(activeSession),
          sessionStatus: activeSession?.status || null,
          latestLogStatus: latestLog?.verificationStatus || null
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing workflow error');
    return res.status(500).json({ success: false, error: 'Failed to fetch workflow', details: error.message });
  }
};

const uploadProfileDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
    const docType = String(req.body?.docType || 'document');
    const allowed = ['avatar', 'cv', 'bankStatement', 'companyRegistration', 'gstDocument', 'businessCertificate', 'portfolio', 'certifications'];
    if (!allowed.includes(docType)) return res.status(400).json({ success: false, error: `Invalid docType. Use: ${allowed.join(', ')}` });

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const folderMap = {
      avatar: 'freelancer-portal/avatars',
      cv: 'freelancer-portal/cv',
      bankStatement: 'freelancer-portal/bank-statements',
      companyRegistration: 'freelancer-portal/company-registration',
      gstDocument: 'freelancer-portal/gst',
      businessCertificate: 'freelancer-portal/certificates',
      portfolio: 'freelancer-portal/portfolio',
      certifications: 'freelancer-portal/certifications',
    };
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: folderMap[docType],
      resource_type: docType === 'avatar' ? 'image' : 'auto',
      public_id: `${docType}_${req.user._id}_${Date.now()}`,
      overwrite: true,
    });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const meta = { ...(user.metadata || {}) };
    if (docType === 'avatar') {
      meta.avatar = uploaded.secure_url;
    } else {
      meta.documents = { ...(meta.documents || {}) };
      meta.documents[docType] = {
        url: uploaded.secure_url,
        fileName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        publicId: uploaded.public_id,
      };
    }
    user.metadata = meta;
    await user.save();

    req.app.get('io')?.to(`outsourcing:user:${req.user._id}`).emit('outsourcing:update', { type: 'profile:updated', data: { docType, url: uploaded.secure_url } });
    return res.status(201).json({
      success: true,
      data: { docType, url: uploaded.secure_url, fileName: req.file.originalname, publicId: uploaded.public_id }
    });
  } catch (error) {
    logger.error({ err: error }, 'Profile document upload error');
    return res.status(500).json({ success: false, error: 'Upload failed', details: error.message });
  }
};

const uploadFreelancerFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(200).json({
        success: true,
        data: {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: null,
          provider: 'local-dev',
          note: 'Cloudinary is not configured. Set CLOUDINARY_* env vars for real uploads.'
        }
      });
    }

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: 'freelancer-portal/uploads',
      resource_type: 'auto'
    });

    return res.status(201).json({
      success: true,
      data: {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        provider: 'cloudinary'
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing file upload error');
    return res.status(500).json({ success: false, error: 'Failed to upload file', details: error.message });
  }
};

const getMyAnalytics = async (req, res) => {
  try {
    const freelancerQuery = isAdmin(req.user) ? {} : { freelancer: req.user._id };
    const [totalContracts, activeContracts, totalLogs, approvedLogs, totalHoursAgg, totalEarningsAgg, sessionsAgg, agreementsAgg] = await Promise.all([
      OutsourcingContract.countDocuments(freelancerQuery),
      OutsourcingContract.countDocuments({ ...freelancerQuery, status: 'active' }),
      OutsourcingTimeLog.countDocuments(freelancerQuery),
      OutsourcingTimeLog.countDocuments({ ...freelancerQuery, verificationStatus: 'approved' }),
      OutsourcingTimeLog.aggregate([
        { $match: freelancerQuery },
        { $group: { _id: null, totalHours: { $sum: '$hours' } } }
      ]),
      OutsourcingTimeLog.aggregate([
        { $match: { ...freelancerQuery, verificationStatus: 'approved' } },
        {
          $lookup: {
            from: 'outsourcingcontracts',
            localField: 'contract',
            foreignField: '_id',
            as: 'contractInfo'
          }
        },
        { $unwind: { path: '$contractInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            amount: {
              $switch: {
                branches: [
                  { case: { $eq: ['$contractInfo.paymentType', 'hourly'] }, then: { $multiply: ['$hours', '$contractInfo.rate'] } },
                  { case: { $in: ['$contractInfo.paymentType', ['daily', 'weekly', 'fixed']] }, then: '$contractInfo.rate' }
                ],
                default: 0
              }
            }
          }
        },
        { $group: { _id: null, totalEarnings: { $sum: '$amount' } } }
      ]),
      OutsourcingWorkSession.aggregate([
        { $match: isAdmin(req.user) ? {} : { worker: req.user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalMinutes: { $sum: { $ifNull: ['$durationMinutes', 0] } }
          }
        }
      ]),
      OutsourcingContract.aggregate([
        { $match: freelancerQuery },
        {
          $group: {
            _id: '$lawStatus',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const sessionsByStatus = Object.fromEntries((sessionsAgg || []).map((row) => [row._id, row]));
    const agreementsByStatus = Object.fromEntries((agreementsAgg || []).map((row) => [row._id, row.count]));

    return res.status(200).json({
      success: true,
      data: {
        contracts: { total: totalContracts, active: activeContracts },
        timeLogs: { total: totalLogs, approved: approvedLogs, approvalRate: totalLogs ? Number(((approvedLogs / totalLogs) * 100).toFixed(2)) : 0 },
        work: { totalHours: Number(totalHoursAgg[0]?.totalHours || 0) },
        earnings: { estimatedApproved: Number(totalEarningsAgg[0]?.totalEarnings || 0) },
        sessions: {
          active: sessionsByStatus.active?.count || 0,
          paused: sessionsByStatus.paused?.count || 0,
          closed: sessionsByStatus.closed?.count || 0,
          totalMinutes: Number(Object.values(sessionsByStatus).reduce((sum, item) => sum + Number(item.totalMinutes || 0), 0))
        },
        agreements: {
          pending: agreementsByStatus.pending || 0,
          validated: agreementsByStatus.validated || 0,
          rejected: agreementsByStatus.rejected || 0
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get outsourcing analytics error');
    return res.status(500).json({ success: false, error: 'Failed to fetch analytics', details: error.message });
  }
};

// ─── Support Tickets ──────────────────────────────────────────────────────────
const createSupportTicket = async (req, res) => {
  try {
    const { subject, category, priority, description } = req.body || {};
    if (!subject || !description) return res.status(400).json({ success: false, error: 'subject and description are required' });
    const ticket = await OutsourcingSupportTicket.create({
      user: req.user._id,
      subject: String(subject).trim(),
      category: ['general','payment','job','technical','account'].includes(category) ? category : 'general',
      priority: ['low','normal','high','urgent'].includes(priority) ? priority : 'normal',
      description: String(description).trim(),
    });
    req.app.get('io')?.to('outsourcing:admins').emit('outsourcing:update', { type: 'ticket:new', data: { _id: ticket._id, priority: ticket.priority } });
    return res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    logger.error({ err: error }, 'Create support ticket error');
    return res.status(500).json({ success: false, error: 'Failed to create ticket', details: error.message });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const tickets = await OutsourcingSupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'firstName lastName email')
      .lean();
    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    logger.error({ err: error }, 'Get my tickets error');
    return res.status(500).json({ success: false, error: 'Failed to fetch tickets', details: error.message });
  }
};

const getAllSupportTickets = async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      OutsourcingSupportTicket.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip).limit(Number(limit))
        .populate('user', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .lean(),
      OutsourcingSupportTicket.countDocuments(query),
    ]);
    return res.status(200).json({ success: true, data: tickets, total, page: Number(page) });
  } catch (error) {
    logger.error({ err: error }, 'Get all support tickets error');
    return res.status(500).json({ success: false, error: 'Failed to fetch tickets', details: error.message });
  }
};

const updateSupportTicket = async (req, res) => {
  try {
    const ticket = await OutsourcingSupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    const { status, reply, assignedTo } = req.body || {};
    if (status && ['open','in_progress','resolved','closed'].includes(status)) {
      ticket.status = status;
      if (status === 'resolved') ticket.resolvedAt = new Date();
      if (status === 'closed') ticket.closedAt = new Date();
    }
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;
    if (reply && String(reply).trim()) {
      const admin = await User.findById(req.user._id).select('firstName lastName email').lean();
      ticket.replies.push({
        author: req.user._id,
        authorName: `${admin?.firstName || ''} ${admin?.lastName || ''}`.trim() || admin?.email || 'Admin',
        message: String(reply).trim(),
        isAdminReply: true,
      });
      if (ticket.status === 'open') ticket.status = 'in_progress';
    }
    await ticket.save();
    req.app.get('io')?.to(`outsourcing:user:${ticket.user}`).emit('outsourcing:update', { type: 'ticket:updated', data: { _id: ticket._id, status: ticket.status } });
    return res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    logger.error({ err: error }, 'Update support ticket error');
    return res.status(500).json({ success: false, error: 'Failed to update ticket', details: error.message });
  }
};

const updateMyPreferences = async (req, res) => {
  try {
    const { notifPrefs, privacyPrefs } = req.body || {};
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const nextMeta = { ...(user.metadata || {}) };
    if (notifPrefs && typeof notifPrefs === 'object') nextMeta.notifPrefs = { ...(nextMeta.notifPrefs || {}), ...notifPrefs };
    if (privacyPrefs && typeof privacyPrefs === 'object') nextMeta.privacyPrefs = { ...(nextMeta.privacyPrefs || {}), ...privacyPrefs };
    user.metadata = nextMeta;
    await user.save();
    return res.status(200).json({ success: true, data: { notifPrefs: nextMeta.notifPrefs, privacyPrefs: nextMeta.privacyPrefs } });
  } catch (error) {
    logger.error({ err: error }, 'Update preferences error');
    return res.status(500).json({ success: false, error: 'Failed to update preferences', details: error.message });
  }
};

module.exports = {
  createOutsourcingUser,
  listFreelancers,
  validateContractByLaw,
  createMilestone,
  submitMilestone,
  approveMilestone,
  createMilestonePayment,
  releaseMilestonePayment,
  completeFreelancerLifecycle,
  createJob,
  assignJobToFreelancer,
  listJobs,
  acceptJob,
  rejectJob,
  updateJobStatus,
  createContract,
  listContracts,
  getContractHistory,
  updateContractTerms,
  logTime,
  updateMyTimeLog,
  listTimeLogs,
  verifyTimeLog,
  requestTimeLogRevision,
  createEscrowOrder,
  verifyEscrowPayment,
  approveEscrowRelease,
  outsourcingDashboard,
  getMyNotifications,
  getMyPayments,
  getMyProfile,
  updateMyProfile,
  uploadProfileDocument,
  getMyWorkspace,
  getMyActivityFeed,
  checkIn,
  checkOut,
  pauseWorkSession,
  resumeWorkSession,
  stopWorkSession,
  getMySessionStatus,
  getMyWorkflow,
  uploadFreelancerFile,
  getMyAnalytics,
  createSupportTicket,
  getMyTickets,
  getAllSupportTickets,
  updateSupportTicket,
  updateMyPreferences,
};
