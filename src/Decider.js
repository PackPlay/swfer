const events = require('events');
const aws = require('aws-sdk');
const uuid = require('node-uuid');
const _ = require('lodash');

function EventWrapper(event, events) {
    // get attribute
    event._attributeName = event.eventType[0].toLowerCase() + event.eventType.substring(1) + 'EventAttributes';

    event.getAttributes = function() {
        return this[this._attributeName];
    };


    // get activity
    event._activity = _.find(events, function(o) {
        return o.eventId === event.getAttributes().scheduledEventId;
    });
    
    event.getActivity = function() {
        return this._activity; 
    };
    
    event.isActivity = function(activity) {
        if(this._activity) {
            return this._activity.name === activity.name && this._activity.version === activity.version; 
        }
        return false;
    };

    return event;
}

class Decider extends events.EventEmitter {
    constructor(domain, taskList) {
        super();
        this.domainName = domain;
        this.taskList = taskList
        this.client = new aws.SWF();
    }
    
    start() {
        this.on('poll', this.poll);
        this.poll();
    }

    poll() {
        console.log('Polling for task',this.domainName + ':' + this.taskList);
        this.client.pollForDecisionTask({
            domain: this.domainName,
            taskList: {
                name: this.taskList
            }
        }, (err, decisionTask) => {
            console.log('Task found');
            if(err) {
                console.error(err);
            } else {
                this.handleDecision(decisionTask);
            }
        })
    }

    handleDecision(decisionTask) {
        let newEvents = this.getNewEventsForDecisionTask(decisionTask);
        for(let e in newEvents) {
            let eventType = newEvents[e].eventType;
            this.emit(eventType, decisionTask, EventWrapper(newEvents[e], decisionTask.events));
        }
        this.emit('poll');
    }

    scheduleActivityTask(activityType, taskList, input, decisionTaskToken) {
        let activityId = activityType.name + '-' + activityType.version + '-' + uuid.v4();
        let attributes = {
            activityType: _.pick(activityType, 'name', 'version'),
            activityId: activityId,
            taskList: {
                name: taskList
            },
            input: input
        };
        let decisions = [{
            decisionType: 'ScheduleActivityTask',
            scheduleActivityTaskDecisionAttributes: attributes
        }];
        let parameters = {
            taskToken: decisionTaskToken,
            decisions:decisions
        };
        this.client.respondDecisionTaskCompleted(parameters, (err, data) => {
            if(err) {
                console.error("Error scheduling activity task: " + err);
              } else {
                console.log("Successfully scheduled activity task: " + data);
              }
        })
    }

    failWorkflowExecution(reason, detail, decisionTaskToken) {
        let decisions = [{
            decisionType: 'FailWorkflowExecution',
            failWorkflowExecutionDecisionAttributes: {
                reason: reason,
                detail: detail
            }
        }];
        let parameters = {
            taskToken: decisionTaskToken,
            decisions: decisions
        };
        this.client.respondDecisionTaskCompleted(parameters, (err, data) => {
            if(err) {
                console.error("Error completing workflow:", err);
              } else {
                console.log("Successfully completing workflow:",data);
              }
        });
    }

    completeWorkflowExecution(result, decisionTaskToken) {
        let decisions = [{
            decisionType: 'CompleteWorkflowExecution',
            completeWorkflowExecutionDecisionAttributes: {
                result: 'success'
            }
        }];
        let parameters = {
            taskToken: decisionTaskToken,
            decisions: decisions
        };
        this.client.respondDecisionTaskCompleted(parameters, (err, data) => {
            if(err) {
                console.error("Error completing workflow:", err);
              } else {
                console.log("Successfully completing workflow:",data);
              }
        });
    }

    getNewEventsForDecisionTask(decisionTask) {
        //  XXX handle paginated events
        if(decisionTask.events) {
            return decisionTask.events.slice( decisionTask.previousStartedEventId );       
        }
        return [];
    }
}

module.exports = Decider;