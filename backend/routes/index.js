const express = require('express');
const router = express.Router();

router.use('/analyze', require('./analyze'));

module.exports = router;
