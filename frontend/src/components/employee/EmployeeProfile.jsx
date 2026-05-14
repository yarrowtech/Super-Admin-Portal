import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { profileApi } from '../../services/profile';
import ProfileCompletionBar from '../profile/ProfileCompletionBar';
import EditableField from '../profile/EditableField';
import SkillTagInput from '../profile/SkillTagInput';
import ExperienceTimeline from '../profile/ExperienceTimeline';
import ProjectCard from '../profile/ProjectCard';
import ResumeUploader from '../profile/ResumeUploader';

const tabs = ['Overview', 'Professional', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications', 'Achievements', 'Social', 'Preferences', 'Resume'];

const score = (draft = {}, user = {}) => {
  let total = 0;
  if (draft.profileImage || user.profileImage) total += 10;
  if (draft.bio) total += 10;
  if ((draft.skills || []).length > 0) total += 20;
  if ((draft.experience || []).length > 0) total += 25;
  if ((draft.projects || []).length > 0) total += 20;
  if (draft.resumeUrl) total += 15;
  return total;
};

const EmployeeProfile = () => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Overview');
  const [draft, setDraft] = useState(null);
  const [unsaved, setUnsaved] = useState(false);
  const [dirtySections, setDirtySections] = useState({});
  const [achievementInput, setAchievementInput] = useState('');
  const [projectInput, setProjectInput] = useState({ title: '', description: '', link: '' });
  const [expInput, setExpInput] = useState({ company: '', role: '', startDate: '', endDate: '', description: '' });
  const [eduInput, setEduInput] = useState({ degree: '', institute: '', yearOfPassing: '', score: '' });
  const [certInput, setCertInput] = useState({ name: '', issuer: '', date: '', credentialLink: '' });

  const profileQuery = useQuery({
    queryKey: ['my-profile', token],
    queryFn: () => profileApi.getMyProfile(token),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const user = profileQuery.data?.data?.user;
    if (!user) return;
    const p = user.profile || {};
    setDraft({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      profileImage: user.profileImage || '',
      headline: p?.basic?.headline || '',
      location: p?.basic?.location || '',
      bio: p?.basic?.bio || '',
      currentRole: p?.professional?.currentRole || '',
      yearsOfExperience: p?.professional?.yearsOfExperience || 0,
      industry: p?.professional?.industry || '',
      preferredJobRole: p?.professional?.preferredJobRole || '',
      employmentStatus: p?.professional?.employmentStatus || 'Open to Work',
      skills: p?.skills || [],
      experience: p?.experience || [],
      education: p?.education || [],
      projects: p?.projects || [],
      certifications: p?.certifications || [],
      achievements: p?.achievements || [],
      linkedin: p?.socialLinks?.linkedin || '',
      github: p?.socialLinks?.github || '',
      portfolio: p?.socialLinks?.portfolio || '',
      preferredLocation: p?.preferences?.preferredLocation || '',
      expectedSalary: p?.preferences?.expectedSalary || '',
      jobType: p?.preferences?.jobType || '',
      resumeUrl: p?.resumeUrl || '',
    });
  }, [profileQuery.data]);

  useEffect(() => {
    const onUnload = (e) => {
      if (!unsaved) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [unsaved]);

  const saveMutation = useMutation({
    mutationFn: (payload) => profileApi.updateMyProfile(token, payload),
    onSuccess: () => {
      setUnsaved(false);
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['my-profile', token] });
    },
    onError: (err) => toast.error(err.message || 'Failed to update profile'),
  });

  const user = profileQuery.data?.data?.user;
  const profileScore = useMemo(() => score(draft || {}, user || {}), [draft, user]);

  const updateField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setUnsaved(true);
    setDirtySections((prev) => ({ ...prev, [activeTab]: true }));
  };

  const save = (section = null) => {
    if (!draft) return;
    if (!section) {
      saveMutation.mutate(draft);
      return;
    }
    const sectionPayload = {
      Overview: { firstName: draft.firstName, lastName: draft.lastName, phone: draft.phone, profileImage: draft.profileImage, basicInfo: { headline: draft.headline, bio: draft.bio, location: draft.location } },
      Professional: { professional: { currentRole: draft.currentRole, experienceYears: draft.yearsOfExperience, industry: draft.industry, preferredRole: draft.preferredJobRole, status: draft.employmentStatus } },
      Experience: { section: 'experience', value: draft.experience },
      Education: { section: 'education', value: draft.education },
      Skills: { section: 'skills', value: draft.skills },
      Projects: { section: 'projects', value: draft.projects },
      Certifications: { section: 'certifications', value: draft.certifications },
      Achievements: { section: 'achievements', value: draft.achievements },
      Social: { socialLinks: { linkedin: draft.linkedin, github: draft.github, portfolio: draft.portfolio } },
      Preferences: { preferences: { location: draft.preferredLocation, expectedSalary: draft.expectedSalary, jobType: draft.jobType } },
      Resume: { section: 'resumeUrl', value: draft.resumeUrl },
    };
    saveMutation.mutate(sectionPayload[section] || draft, {
      onSuccess: () => {
        setDirtySections((prev) => ({ ...prev, [section]: false }));
      }
    });
  };

  const uploadResume = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF resume is allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resume must be less than 5MB');
      return;
    }
    const uploaded = await profileApi.uploadResume(token, file);
    updateField('resumeUrl', uploaded?.data?.resumeUrl || '');
    toast.success('Resume uploaded successfully');
    save('Resume');
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Only PNG, JPG, or WEBP images are allowed');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Avatar must be less than 3MB');
      return;
    }
    const uploaded = await profileApi.uploadAvatar(token, file);
    const avatarUrl = uploaded?.data?.avatarUrl || '';
    updateField('profileImage', avatarUrl);
    toast.success('Avatar uploaded');
    save('Overview');
  };

  if (profileQuery.isLoading || !draft) {
    return <div className="m-4 h-48 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />;
  }

  return (
    <main className="p-3 md:p-5">
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col items-center gap-3">
            <img src={draft.profileImage || 'https://placehold.co/128x128'} alt="avatar" className="h-24 w-24 rounded-full object-cover" />
            <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700">
              Upload Avatar
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            </label>
            <input
              type="text"
              value={draft.profileImage}
              onChange={(e) => updateField('profileImage', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="Profile image URL"
            />
              <ProfileCompletionBar value={profileScore} suggestions={user?.profile?.suggestions || []} />
            <button onClick={() => setActiveTab('Overview')} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">Edit Profile</button>
            <button onClick={() => setActiveTab('Resume')} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold dark:border-neutral-700">Upload Resume</button>
          </div>
        </aside>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${activeTab === tab ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && (
            <div className="grid gap-3 md:grid-cols-2">
              <EditableField label="First Name" value={draft.firstName} onSave={(v) => updateField('firstName', v)} placeholder="First Name" />
              <EditableField label="Last Name" value={draft.lastName} onSave={(v) => updateField('lastName', v)} placeholder="Last Name" />
              <EditableField label="Headline" value={draft.headline} onSave={(v) => updateField('headline', v)} placeholder="Headline" />
              <EditableField label="Location" value={draft.location} onSave={(v) => updateField('location', v)} placeholder="Location" />
              <input value={user.email || ''} readOnly className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800/60" />
              <EditableField label="Phone" value={draft.phone} onSave={(v) => updateField('phone', v)} placeholder="Phone" />
              <div className="md:col-span-2">
                <EditableField label="Bio" value={draft.bio} onSave={(v) => updateField('bio', v)} placeholder="Bio" multiline />
              </div>
            </div>
          )}

          {activeTab === 'Professional' && (
            <div className="grid gap-3 md:grid-cols-2">
              <input value={draft.currentRole} onChange={(e) => updateField('currentRole', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Current Role" />
              <input value={draft.yearsOfExperience} onChange={(e) => updateField('yearsOfExperience', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Years of Experience" />
              <input value={draft.industry} onChange={(e) => updateField('industry', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Industry" />
              <input value={draft.preferredJobRole} onChange={(e) => updateField('preferredJobRole', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Preferred Role" />
              <select value={draft.employmentStatus} onChange={(e) => updateField('employmentStatus', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                <option>Open to Work</option><option>Not Open</option>
              </select>
            </div>
          )}

          {activeTab === 'Experience' && (
            <div>
              <div className="mb-2 grid gap-2 md:grid-cols-2">
                <input value={expInput.company} onChange={(e) => setExpInput((p) => ({ ...p, company: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Company" />
                <input value={expInput.role} onChange={(e) => setExpInput((p) => ({ ...p, role: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Role" />
                <input value={expInput.startDate} onChange={(e) => setExpInput((p) => ({ ...p, startDate: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Start" />
                <input value={expInput.endDate} onChange={(e) => setExpInput((p) => ({ ...p, endDate: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="End" />
                <textarea value={expInput.description} onChange={(e) => setExpInput((p) => ({ ...p, description: e.target.value }))} className="md:col-span-2 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Description" />
              </div>
              <button onClick={() => { if (!expInput.company && !expInput.role) return; updateField('experience', [...draft.experience, { ...expInput, achievements: [] }]); setExpInput({ company: '', role: '', startDate: '', endDate: '', description: '' }); }} className="rounded-lg bg-primary px-3 py-2 text-white">Add Experience</button>
              <div className="mt-2"><ExperienceTimeline items={draft.experience} /></div>
            </div>
          )}

          {activeTab === 'Education' && (
            <div>
              <div className="mb-2 grid gap-2 md:grid-cols-4">
                <input value={eduInput.degree} onChange={(e) => setEduInput((p) => ({ ...p, degree: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Degree" />
                <input value={eduInput.institute} onChange={(e) => setEduInput((p) => ({ ...p, institute: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Institute" />
                <input value={eduInput.yearOfPassing} onChange={(e) => setEduInput((p) => ({ ...p, yearOfPassing: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Year" />
                <input value={eduInput.score} onChange={(e) => setEduInput((p) => ({ ...p, score: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="CGPA/%" />
              </div>
              <button onClick={() => { if (!eduInput.degree && !eduInput.institute) return; updateField('education', [...draft.education, eduInput]); setEduInput({ degree: '', institute: '', yearOfPassing: '', score: '' }); }} className="rounded-lg bg-primary px-3 py-2 text-white">Add Education</button>
            </div>
          )}

          {activeTab === 'Skills' && (
            <div>
              <SkillTagInput skills={draft.skills} onChange={(nextSkills) => updateField('skills', nextSkills)} />
              <div className="space-y-2">{draft.skills.map((x, i) => <div key={`${x.name || 's'}-${i}`} className="grid gap-2 rounded-lg border p-2 md:grid-cols-3"><input value={x.name || ''} onChange={(e) => updateField('skills', draft.skills.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))} className="rounded border px-2 py-1 dark:bg-neutral-800" /><select value={x.level || 'Intermediate'} onChange={(e) => updateField('skills', draft.skills.map((s, idx) => idx === i ? { ...s, level: e.target.value } : s))} className="rounded border px-2 py-1 dark:bg-neutral-800"><option>Beginner</option><option>Intermediate</option><option>Expert</option></select><input value={x.years ?? 0} onChange={(e) => updateField('skills', draft.skills.map((s, idx) => idx === i ? { ...s, years: Number(e.target.value) || 0 } : s))} className="rounded border px-2 py-1 dark:bg-neutral-800" placeholder="Years" /></div>)}</div>
            </div>
          )}

          {activeTab === 'Projects' && (
            <div>
              <div className="mb-2 grid gap-2 md:grid-cols-3">
                <input value={projectInput.title} onChange={(e) => setProjectInput((p) => ({ ...p, title: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Title" />
                <input value={projectInput.link} onChange={(e) => setProjectInput((p) => ({ ...p, link: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Link" />
                <input value={projectInput.description} onChange={(e) => setProjectInput((p) => ({ ...p, description: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Description" />
              </div>
              <button onClick={() => { if (!projectInput.title) return; updateField('projects', [...draft.projects, { ...projectInput, techStack: [] }]); setProjectInput({ title: '', description: '', link: '' }); }} className="rounded-lg bg-primary px-3 py-2 text-white">Add Project</button>
              <div className="mt-2 grid gap-2 md:grid-cols-2">{draft.projects.map((x, i) => <ProjectCard key={`${x.title || 'p'}-${i}`} project={x} />)}</div>
            </div>
          )}

          {activeTab === 'Certifications' && (
            <div>
              <div className="mb-2 grid gap-2 md:grid-cols-2">
                <input value={certInput.name} onChange={(e) => setCertInput((p) => ({ ...p, name: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Name" />
                <input value={certInput.issuer} onChange={(e) => setCertInput((p) => ({ ...p, issuer: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Issuer" />
                <input value={certInput.date} onChange={(e) => setCertInput((p) => ({ ...p, date: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Date" />
                <input value={certInput.credentialLink} onChange={(e) => setCertInput((p) => ({ ...p, credentialLink: e.target.value }))} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Credential Link" />
              </div>
              <button onClick={() => { if (!certInput.name) return; updateField('certifications', [...draft.certifications, certInput]); setCertInput({ name: '', issuer: '', date: '', credentialLink: '' }); }} className="rounded-lg bg-primary px-3 py-2 text-white">Add Certification</button>
            </div>
          )}

          {activeTab === 'Achievements' && (
            <div>
              <div className="mb-2 flex gap-2">
                <input value={achievementInput} onChange={(e) => setAchievementInput(e.target.value)} className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Achievement" />
                <button onClick={() => { if (!achievementInput.trim()) return; updateField('achievements', [...draft.achievements, achievementInput.trim()]); setAchievementInput(''); }} className="rounded-lg bg-primary px-3 py-2 text-white">Add</button>
              </div>
              <div className="space-y-2">{draft.achievements.map((x, i) => <div key={`${x}-${i}`} className="rounded-lg border p-2 text-sm">{x}</div>)}</div>
            </div>
          )}

          {activeTab === 'Social' && (
            <div className="grid gap-3 md:grid-cols-2">
              <input value={draft.linkedin} onChange={(e) => updateField('linkedin', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="LinkedIn" />
              <input value={draft.github} onChange={(e) => updateField('github', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="GitHub" />
              <input value={draft.portfolio} onChange={(e) => updateField('portfolio', e.target.value)} className="md:col-span-2 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Portfolio" />
            </div>
          )}

          {activeTab === 'Preferences' && (
            <div className="grid gap-3 md:grid-cols-3">
              <input value={draft.preferredLocation} onChange={(e) => updateField('preferredLocation', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Preferred Location" />
              <input value={draft.expectedSalary} onChange={(e) => updateField('expectedSalary', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Expected Salary" />
              <select value={draft.jobType} onChange={(e) => updateField('jobType', e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"><option value="">Job Type</option><option>Full-time</option><option>Remote</option><option>Hybrid</option><option>Contract</option></select>
            </div>
          )}

          {activeTab === 'Resume' && (
            <ResumeUploader resumeUrl={draft.resumeUrl} onUpload={uploadResume} />
          )}

          <div className="mt-5 flex gap-2">
            <button onClick={() => save(activeTab)} disabled={saveMutation.isPending || !dirtySections[activeTab]} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saveMutation.isPending ? 'Saving...' : `Save ${activeTab}`}
            </button>
            <button onClick={() => save()} disabled={saveMutation.isPending || !unsaved} className="rounded-lg bg-primary/80 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => { setUnsaved(false); profileQuery.refetch(); }} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold dark:border-neutral-700">Cancel</button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default EmployeeProfile;
