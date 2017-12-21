const AWS = require('aws-sdk');
module.exports = {
    config: function(config) {
        AWS.config.update(config);
    },
    Activity: require('./src/Activity'),
    Decider: require('./src/Decider')
};