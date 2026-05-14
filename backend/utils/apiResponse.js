module.exports = {
  success: (data = null, message = 'OK') => ({ success: true, message, data }),
  error: (message = 'Error', data = null) => ({ success: false, message, data }),
};
