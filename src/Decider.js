const events = require('events');
const aws = require('aws-sdk');
const uuid = require('node-uuid');

function EventWrapper(event) {
    event.getResult = function() {
        return this.activityTaskCompletedEventAttributes.result;
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
            this.emit(eventType, decisionTask, EventWrapper(newEvents[e]));
        }
        this.emit('poll');
    }

    scheduleActivityTask(activityType, taskList, input, decisionTaskToken) {
        let activityId = activityType + '-' + uuid.v4();
        let attributes = {
            activityType: activityType,
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