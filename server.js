const express = require('express');
const app = express();
const server = require('http').Server(app);
const port = process.env.PORT || 8080;;
const https = require('https');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
//Підключаємо проект до GitHub


//Підключаємо скрипт з логіном і паролем до пошти
const mail = require('./js/mail');
//Конектимось до пошти
const nodemailer = require('nodemailer')
    , transporter = nodemailer.createTransport({
        service: 'gmail'
        , auth: {
            user: mail.mail
            , pass: mail.pass
        }
    , })
    , EmailTemplate = require('email-templates-v2').EmailTemplate
    , path = require('path')
    , Promise = require('bluebird');
const twilio = require('twilio');
const clientTwilio = new twilio('AC209898f22fcde74919cc18bd2758b678', '202fac0892fc05a4f2cfd994f3aad53b');

 //Підключаємо скрипт читання/запису у текстовий файл
const text = require('./js/about-item');
const multer  = require('multer');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname);
    }
});
var upload = multer({
    storage: storage
});

const io = require('socket.io').listen(server);



app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    'extended': 'true'
}));


//MySQL
const connection = mysql.createConnection({
      host: 'https://www.cleardb.com/database/details?id=939C9BA46DE119CF092E6639050A02EA'
    , user: 'b5d1c69d629027'
    , password: 'c9c55946'
    , database: 'heroku_964e4b7f0a0c233'
});


// Ставорення таблиці користувачів
const initDb = function () {
    //створити таблицю юзерів(якщо не було)   
    connection.query('' + 'CREATE TABLE IF NOT EXISTS users (' + 'id int(11) NOT NULL AUTO_INCREMENT,' + 'login varchar(50), ' + 'password varchar(50),' + 'PRIMARY KEY(id), ' + 'UNIQUE INDEX `login_UNIQUE` (`login` ASC))', function (err) {
        if (err) throw err;
        //додати адміна в таблицю юзерів(якщо не має)
        console.log('CREATE TABLE IF NOT EXISTS users');
    });
};
initDb();
io.sockets.on('connection', function (socket) {
    console.log('user connected');
    //Отримання користувачів - бізнес логіка на стороні сервера
    socket.on('signIn', function (data) {
            connection.query('SELECT * FROM users', function (err, rows) {
                if (err) throw err;
                for (var i = 0; i < rows.length; i++) {
                    if (rows[i].login == data.login) {
                        if (rows[i].password == data.password) {
                            socket.emit('getSignIn', 'Hello ' + rows[i].login );
                            break;
                        }
                        else {
                            socket.emit('getSignIn', 'Wrong Password');
                            break;
                        }
                    }
                    else {
                        if (i == rows.length - 1) {
                            socket.emit('getSignIn', 'Wrong Login');
                        }
                    }
                }
            });
        })
});

io.sockets.on('connection', function (socket) {
    //Нагадати пароль 
   socket.on('forgetPassword', function (data) {
       connection.query('SELECT * FROM users  WHERE mail = ?', data.mail, function (err, rows) {
            if (err) throw err;
            if (rows[0] != undefined) {
                loadTemplate('forget_password', rows).then((results) => {
                    return Promise.all(results.map((result) => {
                        sendEmail({
                            to: data.mail, // замінити на свою пошту
                            from: 'localhost'
                            , subject: result.email.subject
                            , html: result.email.html
                            , text: result.email.text
                        , });
                    }));
                }).then(() => {
                    socket.send("Sent password!");
                });
            }
            else {
                socket.send("wrong mail");
            }
        });
   });
});
   
    //Відправка пошти (функція)
    function sendEmail(obj) {
        return transporter.sendMail(obj);
    }

    function loadTemplate(templateName, contexts) {
        var template = new EmailTemplate(path.join(__dirname, 'mail_templates', templateName));
        return Promise.all(contexts.map((context) => {
            return new Promise((resolve, reject) => {
                template.render(context, (err, result) => {
                    if (err) reject(err);
                    else resolve({
                        email: result
                        , context
                    , });
                });
            });
        }));
    }
    //Добавити користувача
io.sockets.on('connection', function (socket) {    
    socket.on('signUp', function(data) {
        connection.query('SELECT * FROM users  WHERE login = ?',
                         data.login, function (err, rows) {
            if (err) throw err;
            if (rows[0] == undefined) {
                connection.query('INSERT INTO users SET login = ? , password = ? , mail = ?', [data.login, data.password, data.mail], function (err, result) {
                    if (err) throw err;
                    console.log('user added to database with id: ' + result.insertId);
                    socket.send(data.login + " created");
                });
            }
            else {
                socket.send("pls choose another login");
            }
        })
    })
    //Twilio

    socket.on('twilio', function (data) {
        clientTwilio.messages.create({
            body: data.code
            , to: data.number
            , from: '+15622866660 ' 
            });
        })
//        .then((message) => console.log(message.sid));

});

//Отримання товарів
app.get('/items', function (req, res) {
    connection.query('SELECT * FROM items', function (err, rows) {
        if (err) throw err;
        console.log('get all items, length: ' + rows.length);
        res.status(200).send(rows);
    });
});

//Upload images
app.post('/images', upload.any(), function (req, res, next) {
    res.sendStatus(200);
})

//Запис товарів в бд
app.post('/items', function (req, res) {
    connection.query('INSERT INTO items SET ?', req.body,
        function (err, result) {
            if (err) throw err;
            console.log('item added to database with id: ' + result.insertId);
        }
    );
    res.sendStatus(200);
});

//Запис/читання опису товару у текстовий файл
//Читання
app.get('/items-info', function (req, res) {
    var str = new ItemsInfo().readInfo().toString().split('/item/');
    res.status(200).send(str);
});
//Запис
app.post('/items-info', function (req, res) {
    var str = new ItemsInfo().readInfo().toString();
    if (str == "") {
        str = str + req.body.text;
    } else {
        str = str + "/item/" + req.body.text;
    }
    var str2 = new ItemsInfo().writeInfo(str);
    res.sendStatus(200);
});
//Змінити дані товару в бд
app.post('/item-edit/:id', function (req, res) {
    connection.query('UPDATE items SET name = ?, price = ?, src = ? WHERE id = ?',
        [req.body.name, req.body.price, req.body.src, req.params.id],
        function (err) {
            if (err) throw err;
            console.log('item update id: ' + req.params.id);
        }
    );
    res.sendStatus(200);
});
//Зміна опису товару в ткст файлі
app.put('/items-info', function (req, res) {
    var str = new ItemsInfo().writeInfo(req.body.text);
    res.sendStatus(200);
});

//Видалити товар
app.delete('/item/:id', function (req, res) {
    connection.query('DELETE FROM items WHERE id = ?',req.params.id, function (err) {
            if (err) throw err;
            console.log('item delete id: ' + req.body.id);
        }
    );
    res.sendStatus(200);
});

// Chat

var connections = [];
io.on('connection', function (socket) {
    connections.push(socket);
    console.log("Connected: %s sockets connected", connections.length);
    
    socket.on('disconnect', function(data){
		connections.splice(connections.indexOf(socket), 1);
		console.log('Disconnected: %s sockets connected', connections.length); 
    });
    socket.on('send message', function(data){
        io.sockets.emit('chat message', data);
    })
})

//Усі адреси регулюються з index.html
app.get('*', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
server.listen(port, function (err) {
    if (err) throw err;
    console.log('Server start on port 8080!');
});