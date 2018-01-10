const aws = require('aws-sdk');
module.exports = {
    config: function(config) {
        aws.config.update(config);
    },
    Activity: require('./src/Activity'),
    Decider: require('./src/Decider'),
    Workflow: require('./src/Workflow')
};