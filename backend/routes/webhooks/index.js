const express = require('express');
const router = express.Router();

router.use('/kiwify', require('./kiwify'));

module.exports = router;