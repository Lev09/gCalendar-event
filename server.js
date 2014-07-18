var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var event = require('./event');


app.use(express.static(__dirname + '/sample'));
app.use(bodyParser.urlencoded());

app.get('/calendarEvent', event.list);
app.post('/calendarEvent', event.save);

var server = app.listen(3033, function() {
    console.log('Listening on port %d', server.address().port);
});
