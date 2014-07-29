var _ = require('underscore');
var googleapis = require('googleapis');
var OAuth2 = googleapis.auth.OAuth2;

var newOauth2Client = function() {
	var oauth2Client = new OAuth2(
		'****.apps.googleusercontent.com', 
		'****',
		'http://127.0.0.1:3033/oauth/google/callback');
	return oauth2Client;
};

var connectCalendar = function(tokens, done) {
	var oauth2Client = newOauth2Client();
	oauth2Client.setCredentials(tokens);
	
	googleapis
	  .discover('calendar', 'v3')
	  .withAuthClient(oauth2Client)
	  .execute(function(err, client) {
			if (err) {
				console.log('Problem during the client discovery.', err);
				return;
			}
			done(client);
		});
};

module.exports = {
	
	getStatistic : function(req, res) {
		//assume that client is sending  tokens, calendar id and the time period
		var config = req.query;
	
		var params = {
			calendarId: config.calendarId,
			timeMin: config.startDate,
			timeMax: config.endDate
		};
		
		connectCalendar(config.tokens, function(client) {
			client.calendar.events.list(params)
			.execute(function(error, tasks) {
				if (error) {
					console.log("error ", error);
				}
				if (tasks) {
					modify(tasks, params, function(statistic) {					
						res.send(JSON.stringify(statistic));
					});
				}
			});
		});
		
	},

	save: function(req, res) {
		var config = req.body;
		
		var myEvent	= {
			summary: config.taskName,
			start: {
				dateTime: config.startDate
			},
			end: {
				dateTime: config.endDate
			}
		};
	
		connectCalendar(config.tokens, function(client) {
			client.calendar.events.insert({calendarId: config.calendarId}, myEvent)
			.execute(function(error, data) {
				if (error) console.log("error ", error);
				if (data) res.send(JSON.stringify(data));
			});
		});
		
	}

};

var modify = function(tasks, params, done) {
	
	var statistic = {
		intervalStartDate: params.timeMin,
		totalTime: getDatesDifference(params.timeMin, params.timeMax),
		tasks: [],
	};
	
	_.each(tasks.items, function(task) {
		var quantity = 0;
		
		var newtask = {
			name: '',
			start: {
				dateTime: []
			},
			end: {
				dateTime: []
			},
			duration: []
		};
		
		for(i = 0; i<tasks.items.length; i++) {
			if(task.summary === tasks.items[i].summary) {
				
				var intervalStart = Date.parse(params.timeMin);
				var intervalEnd = Date.parse(params.timeMax);
				
				var taskStart = tasks.items[i].start.dateTime;
				var taskEnd = tasks.items[i].end.dateTime;
				
				if(Date.parse(taskStart) >= intervalStart && Date.parse(taskEnd) <= intervalEnd) {
					quantity ++;
					newtask.name = task.summary
					newtask.start.dateTime.push(taskStart);
					newtask.end.dateTime.push(taskEnd);
					var duration = getDatesDifference(taskStart, taskEnd);
					newtask.duration.push(duration);
					newtask.quantity = quantity;
				}
			}
		}
		
		if (quantity) {
			statistic.tasks.push(newtask);
		}
		
	});
	statistic.tasksQuantity = statistic.tasks.length;
	
	statistic = removeDublicates(statistic);
	statistic = calculateTimeAndPercent(statistic);
	console.log(statistic);
	done(statistic);
};

var removeDublicates = function(statistic) {
		
	_.each(statistic.tasks, function(task) {
		var quantity = 0;
		for(i = 0; i<statistic.tasks.length; i++) {
			if(statistic.tasks[i].name === task.name) {
				quantity++;
				if(quantity > 1) {
					statistic.tasks.splice(i, 1);
				}
			}
		}
	});
	
	_.each(statistic.tasks, function(task) {
	
		_.each(task.duration, function(duration) {
			var quantity = 0;
			for(i = 0; i<task.duration.length; i++) {
				if(task.duration[i].inMs === duration.inMs) {
					quantity++;
					if(quantity > 1) {
						task.duration.splice(i, 1);
					}
				}
			}
		});
		
		var duration = 0;
		for(i = 0; i<task.duration.length; i++) {
			duration += task.duration[i].inMs;
		}
		task.duration = duration;
		
	});

	return statistic;
};

var calculateTimeAndPercent = function(statistic) {
	
	_.each(statistic.tasks, function(task) {		
		task.start.dateTime.sort();
		task.end.dateTime.sort();
		
		var firstStart = task.start.dateTime.shift();
		task.start.dateTime = firstStart;
		
		var lastEnd = task.end.dateTime.pop();
		task.end.dateTime = lastEnd;
		
		task.totalTime = getDatesDifference(statistic.intervalStartDate, lastEnd);
		
		task.totalPercent = getPercent(statistic.totalTime.inMs, task.duration);
	});
	
	return statistic;
};

var getDatesDifference = function(start, end) {
	var start = Date.parse(start);
	var end = Date.parse(end);
	var ms = end - start;
	var x = ms / 1000
	var seconds = x % 60
	x /= 60
	minutes = x % 60
	x /= 60
	hours = x % 24
	x /= 24
	days = x
	return {
		inMs: ms,
		days: Math.round(days),
		hours: Math.round(hours),
		minutes: Math.round(minutes),
		seconds: Math.round(seconds)
	};
};

getPercent = function(total, number) {
	var percent = number/total*100;
	if (Math.round(percent) == 0) { return 1;	}
	else { return Math.round(percent); }
};
