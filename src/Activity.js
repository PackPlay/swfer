const events = require('events');
const aws = require('aws-sdk');

class Activity extends events.EventEmitter {
    constructor(domain, taskList) {
        super();
        this.domainName = domain;
        this.taskList = taskList;
        this.client = new aws.SWF();
    }

    start() { 
        this.on('poll', this.poll);
        this.poll();
    }

    poll() {
        console.log('Polling for activity',this.domainName + ':' + this.taskList);
        this.client.pollForActivityTask({
            domain: this.domainName,
            taskList: {
                name: this.taskList
            }
        }, (err, activityTask) => {
            console.log('Task found');
            if(err) {
                console.error(err);
            } else {
                this.handleActivity(activityTask);
            }
        })
    }
    handleActivity(activityTask) {
        if(activityTask.taskToken) {
            this.emit('ActivityTask', activityTask);
        }
        this.emit('poll');
    }

    fail(reason, description, activityTaskToken) {
        this.client.respondActivityTaskFailed({taskToken: activityTaskInfo.taskToken, reason: reason, details: description});
    }
    
    complete(result, activityTaskToken) {
        this.client.respondActivityTaskCompleted({
            taskToken: activityTaskToken,
            result: result
        }, (err, data) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Completed', data);
            }
        })
    }
}

module.exports = Activity;