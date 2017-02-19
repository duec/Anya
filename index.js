// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 80;
var bodyParser = require('body-parser');
var hbs = require('hbs');
var path = require('path');

app.set('view engine', 'html');
app.set('views', __dirname + '/public');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.engine('html', hbs.__express);

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});


app.get('/chat/:id',function(req, res){
  var id = req.params.id
  res.render('index');
});

// usernames which are currently connected to the chat
var chatrooms = {};

io.on('connection', function (socket) {
  var addedUser = false;
  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.to(socket.room).emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (data) {
    addedUser = true;
    // we store the username in the socket session for this client
    username = data.username
    room = data.room
    socket.username = username;
    socket.room = room;

    socket.join(room)
    // add the client's username to the global list
    if (!(room in chatrooms)) {
      chatrooms[room] = {};
    }
    chatrooms[room][username] = {};
    
    socket.emit('login', {
      numUsers: Object.keys(chatrooms[room]).length
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.to(room).emit('user joined', {
      username: socket.username,
      numUsers: Object.keys(chatrooms[room]).length
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.to(socket.room).emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.to(socket.room).emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      // remove the username from global usernames list
      delete chatrooms[socket.room][socket.username];
      // echo globally that this client has left
      socket.broadcast.to(socket.room).emit('user left', {
        username: socket.username,
        numUsers: Object.keys(chatrooms[socket.room]).length
      });
    }
  });
});
