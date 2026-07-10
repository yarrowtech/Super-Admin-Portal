const logger = require('../../utils/logger');
const calendarService = require('./calendar.service');

exports.getCalendar = async (req, res) => {
  try {
    const data = await calendarService.getAggregatedCalendar(req.projectId, {
      from: req.query?.from,
      to: req.query?.to,
    });
    res.status(200).json({ success: true, data: { items: data } });
  } catch (err) {
    logger.error({ err }, 'Media module getCalendar error');
    res.status(500).json({ success: false, error: 'Failed to fetch calendar', details: err.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    if (!req.projectId) return res.status(400).json({ success: false, error: 'projectId is required' });
    const data = await calendarService.createEvent(req.projectId, req.body || {}, req.user?.id || req.user?._id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, 'Media module createEvent error');
    res.status(500).json({ success: false, error: 'Failed to create calendar event', details: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    if (!req.projectId) return res.status(400).json({ success: false, error: 'projectId is required' });
    const data = await calendarService.updateEvent(req.params.id, req.projectId, req.body || {}, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: 'Calendar event not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, 'Media module updateEvent error');
    res.status(500).json({ success: false, error: 'Failed to update calendar event', details: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    if (!req.projectId) return res.status(400).json({ success: false, error: 'projectId is required' });
    const data = await calendarService.deleteEvent(req.params.id, req.projectId, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: 'Calendar event not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, 'Media module deleteEvent error');
    res.status(500).json({ success: false, error: 'Failed to delete calendar event', details: err.message });
  }
};
