var express = require("express"),
    app = express(),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override'),
    hostname = process.env.HOSTNAME || 'localhost',
    port = 8080;

app.get("/", function (req, res) {
  res.redirect("/index.html");
});

var auth = require('./authenticate.js');

var db = require('mongoskin').db('mongodb://user:password@localhost:27017/photos');
console.log(db);

app.get("/addtodo", function (req, res) {
	var x = req.query;
	var callback = function(error, result){
		if(result)
		{
			res.end("added");
		}
	}
	db.collection("todo").insert(x, callback);
 });

 app.get("/renamePhoto", function (req, res) {
 	var x = req.query;
 	var callback = function(error, result){
 		if(result)
 		{
 			res.end("done");
 		}
 	}

	db.collection(req.query.collection).findOne({id: x.id}, function(err, result1) {
		if(result1){
			console.log(result1);
			result1.name = x.name;
			db.collection(req.query.collection).save(result1, callback);
		}
		else{
			db.collection(req.query.collection).insert(x, callback);
		}
	});

  });




app.get("/deletephoto", function (req, res) {
	var x = req.query;
	var callback = function(error, result){
		if(result)
		{
			res.end("deleted");
		}
	}
  console.log(x);
	db.collection(req.query.collection).remove({"id": x.id}, callback);
});


app.get("/listphotos", function (req, res) {
	db.collection(req.query.collection).find().toArray(function(err, result) {
    	if (result)
    	{
			res.end(JSON.stringify(result));
		}
	});
});

app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
app.use(cookieParser('ame498'));
app.use(expressSession());


app.use(express.static(__dirname + '/client'));
app.use(errorHandler({
  dumpExceptions: true,
  showStack: true
}));


var fs = require('fs');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./credentials.json');
var s3 = new AWS.S3()//.client;

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
app.use('/uploadFile', multipartMiddleware);

app.post('/uploadFile', function(req, res){
     var intname = req.body.fileInput;
     var fordb = JSON.parse(decodeURIComponent(req.body.fordb));
     console.log(JSON.stringify(fordb));

     db.collection(req.body.collection).insert(fordb, function(err2, result){
         if(result){
             res.end("success");
         }
     });

     var tmpPath = req.files.input.path;
     var s3Path = '/' + intname;

     fs.readFile(tmpPath, function (err, data) {
         var params = {
             Bucket:'ameweb',
             ACL:'public-read',
             Key:intname,
             Body: data
         };
         s3.putObject(params, function(err1, data) {});
		 });

});


app.get('/logout', function(req, res){
    // destroy the user's session to log them out
    req.session.destroy(function(){
        res.send("You have been logged out");
    });
});


app.get('/login', function(req, res){
        auth.authenticate(req.query.userID, req.query.password,'users', 'user', db, function(err, user){
            if (user) {
                // Regenerate session when signing in
                req.session.regenerate(function(){
                        req.session.userID = user.userID;
                        req.session.userType = 'user';
                        req.session.collection = 'users';
                        req.session.password = user.password;
                        res.send('1');
                });

            } else {
                res.send('0');
            }
        });
});

app.get('/getUser', function(req, res){
	auth.restrict(req, res, db, ['user'], function(ret){
			if(ret){
					db.collection(collection).findOne({userID: info.userID}, function(err, result) {
					if(result) {
                            //res.writeHead(200, "OK", {'Content-Type': 'text/plain'});
                            var output = JSON.stringify(result);
                            res.write(output);
                            res.end();
					}
                    else{
                        res.send('0');
                    }
				    });
			}
			else {
				res.send('noauth');
				res.end();
			}
		});
});

app.get('/createUser', function(req, res){
				db.collection(req.query.collection).findOne({userID:req.query.userID}, function(err, result) {
						if(result) {
							res.send('0');
						} else {
							db.collection(req.query.collection).insert(req.query, function(err, result) {
							if (err) throw err;
							if (result) {
								res.send('1');
							}
						});
					}
		  });
	  });

console.log("Simple static server listening at http://" + hostname + ":" + port);
app.listen(port, hostname);
