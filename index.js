const fs 		= require('fs')
const path 		= require('path')
const csvToObj 	= require('csv-to-js-parser').csvToObj

const express 	= require('express')
const app 		= express()
const http 		= require('http').createServer(app)
const io 		= require('socket.io')(http)

console.log("\n\n\n\n\n> STARTING ---------------\n")

app.use( express.static('public') )
// app.get('/', (req, res) => {
// 	res.sendFile(__dirname + '/public/index.html')
// })

const unique = (value, index, self) => {
  return self.indexOf(value) === index
}


let studentsList 	= csvToObj( fs.readFileSync(path.join(__dirname, 'data', 'etudiants.csv')).toString() )
let lessonsList 	= JSON.parse( fs.readFileSync(path.join(__dirname, 'data', 'cours.json') ).toString() )
let uniqueTeachers  = new Array()

console.log(studentsList)
console.log(lessonsList.calendar[0])

lessonsList.calendar.forEach(experience => {
	console.log(experience.title)

	uniqueTeachers = uniqueTeachers.concat(experience.teachers).filter(unique)
})

console.log(uniqueTeachers)

io.on('connection', (socket) => {
	console.log('a user connected')
	socket.on('disconnect', () => {
		console.log('user disconnected')
	});
	socket.on('chat message', (msg) => {
		console.log('message: ' + msg)
		io.emit('chat message', msg)
	});
	socket.broadcast.emit('hi')
	socket.emit("info","data")
});

http.listen(3000, () => {
	console.log('listening on *:3000')
})