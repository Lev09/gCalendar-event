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
			return;
			
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
		tasksQuantity: tasks.items.length,
		totalTime: getDatesDifference(params.timeMin, params.timeMax),
		tasks: [],
	};
	
	_.each(tasks.items, function(task) {
		var quantity = 0;
		
		var newtask = {
			name: task.summary,
			start: {
				dateTime: []
			},
			end: {
				dateTime: []
			}
		};
		
		for(i = 0; i<tasks.items.length; i++) {
			if(task.summary === tasks.items[i].summary) {
				quantity ++;
				newtask.start.dateTime.push(params.timeMin);
				newtask.end.dateTime.push(tasks.items[i].end.dateTime);
				newtask.quantity = quantity;
			}
		};
		statistic.tasks.push(newtask);
	});
	
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
		
		task.totalTime = getDatesDifference(firstStart, lastEnd);
		task.totalpercent = getPercent(statistic.totalTime.inMs, task.totalTime.inMs);
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
	return Math.round(percent);
};
