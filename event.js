var googleapis = require('googleapis');
var OAuth2 = googleapis.auth.OAuth2;

var newOauth2Client = function() {
	var oauth2Client = new OAuth2(
		'38526860757-ikk5fn0keh76r1fgjq7nlaldnnjn3kqo.apps.googleusercontent.com', 
		'mZ7HelTOADzvoCyc7sf4ISNm',
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
	
	list: function(req, res) {
		var config = req.query;
	
		var params = {
			calendarId: config.calendarName,
			timeMin: config.startDate,
			timeMax: config.endDate
		};
		
		connectCalendar(config.tokens, function(client) {
			client.calendar.events.list(params)
			.execute(function(error, events) {
				if (error) console.log("error ", error);
				if (events) res.send(events);
			});
		});
		
	},

	save: function(req, res) {
		var config = req.body;
		
		var myEvent	= {
			description: config.taskName,
			start: {
				dateTime: config.startDate
			},
			end: {
				dateTime: config.endDate
			}
		};
	
		connectCalendar(config.tokens, function(client) {
			client.calendar.events.insert({calendarId: config.calendarName}, myEvent)
			.execute(function(error, data) {
				if (error) console.log("error ", error);
				if (data) res.send(data);
			});
		});
		
	}

};
