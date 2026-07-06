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
