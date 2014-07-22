var _ = require('underscore');
var googleapis = require('googleapis');
var OAuth2 = googleapis.auth.OAuth2;

var newOauth2Client = function() {
	var oauth2Client = new OAuth2(
		'*****.apps.googleusercontent.com', 
		'*****',
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

var removeDublicates = function(result) {
	result.items = result.items.sort();
	_.each(result.items, function(item) {
		
		var count = 0;
		for(i = 0; i<result.items.length; i++) {
			if(result.items[i].summary === item.summary) {
				count++;
				if(count >= 1) {
					result.items.splice(i, 1);
				}
			}
		}
			
	});
	
	return result;
};

var modify = function(tasks, done) {
	
	var result = {
		totalCount: tasks.items.length,
		totalTime:'',
		items: [],
	};
	
	_.each(tasks.items, function(task) {
		var count = 0;
		
		var newItem = {
			summary: task.summary,
			start: {
				dateTime: []
			},
			end: {
				dateTime: []
			}
		};
		
		for(i = 0; i<tasks.items.length; i++) {
			if(task.summary === tasks.items[i].summary) {
				count ++;
				newItem.start.dateTime.push(tasks.items[i].start.dateTime);
				newItem.end.dateTime.push(tasks.items[i].end.dateTime);
				newItem.tasksCountity = count;
			}
		};
		result.items.push(newItem);
	});
	
	result = removeDublicates(result);
	//result = calculateTimeAndPercent(result);
	done(result);
};

module.exports = {
	
	getStatistic : function(req, res) {
		//assume that client is sending  tokens, calendar id and the time period
		var config = req.query;
		console.log(config);				

		var params = {
			calendarId: config.calendarId,
			timeMin: config.startDate,
			timeMax: config.endDate
		};
		
		connectCalendar(config.tokens, function(client) {
			client.calendar.events.list(params)
			.execute(function(error, tasks) {
				if (error) console.log("error ", error);
				if (tasks) {
					//res.send(tasks);
					var statistic = modify(tasks, function(statistic) {					
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
				if (data) res.send(data);
			});
		});
		
	}

};
