// https://codeforgeek.com/manage-session-using-node-js-express-4/
// v 0.12 alpha


const fs 			= require('fs')
const path 			= require('path')
const csvToObj 		= require('csv-to-js-parser').csvToObj

const express 		= require('express')
const socket 		= require('socket.io')
const cookieParser 	= require('cookie-parser')
const session		= require('express-session')

const router 		= express.Router()
const app 			= express()



/**
 * GESTION DATA ------------------------------------------------------------------
 */
const unique = (value, index, self) => {
  return self.indexOf(value) === index
}

const string_to_slug = (str) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
  
    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

const divideInteger = (value, divide) => {
	var num;
	var modular = value % divide;
	if(modular == 0){
		num = value/divide;
		sumOfDivideParts = Array(divide).fill(num);
	} else {
		num = (value-modular)/divide;
		sumOfDivideParts = Array(divide).fill(num);
		for(i=0;i<modular;i++){
			sumOfDivideParts[i] = sumOfDivideParts[i] + 1;
		}
		sumOfDivideParts.reverse()
	}
	return sumOfDivideParts;
}


console.log('\033[2J') // re-init console
console.log("> STARTING ---------------")	

let data_app = {}
let data_file_path = path.join( __dirname, 'data', 'data-app.json')


// LISTE ADMINS 
let adminsObjList = csvToObj( fs.readFileSync( path.join(__dirname, 'data', 'admins.csv')).toString() )
let adminsList 	= {}
adminsObjList.forEach((admin,index) => {
	// console.log(index, admin)
	admin.approches = {}
	adminsList[ admin.mail ] = admin
})


// LISTE ETUDIANTS
let studentsObjList = csvToObj( fs.readFileSync( path.join(__dirname, 'data', 'etudiants.csv')).toString() )
let studentsList 	= {}
studentsObjList.forEach((etudiant,index) => {
	// console.log(index, etudiant)
	etudiant.approches = {}
	studentsList[ etudiant.mail ] = etudiant
})

let nbr_students = Object.keys(studentsList).length

// console.log(nbr_students)
// console.log(studentsList)

if( ! fs.existsSync( data_file_path ) ){

	console.log("NEW DATA GENERATION")

	
	let lessonsObjList 	= JSON.parse( fs.readFileSync( path.join(__dirname, 'data', 'cours.json') ).toString() )
	let lessonsList 	= {}
	let teachersList  	= {}




	// console.log(lessonsList.calendar[0])

	lessonsObjList.approches.forEach(experience => {
		// console.log(experience.titre)
		// uniqueTeachers = uniqueTeachers.concat(experience.enseignants).filter(unique)
		// uniqueTeachers = uniqueTeachers.concat(experience.enseignants)

		experience.validated = false
		experience.id = string_to_slug(experience.titre)

		// console.log(nbr_students, Object.keys(experience.enseignants).length )

		let nbr_approches = Object.keys(experience.enseignants).length
		let students_per_approche = divideInteger(nbr_students, nbr_approches)

		let teachers_approche = {}

		experience.enseignants.forEach((enseignant, index) =>{

			enseignant.places 		= students_per_approche[ index ]
			enseignant.max_places 	= students_per_approche[ index ]
			enseignant.id 			= string_to_slug(enseignant.nom)
			enseignant.selected		= false

			teachersList[ string_to_slug(enseignant.nom) ] = { 
				nom : enseignant.nom,
				id : string_to_slug(enseignant.nom),
				active:false
			}

			teachers_approche[ string_to_slug(enseignant.nom) ] = enseignant
		})

		experience.enseignants = teachers_approche

		lessonsList[ string_to_slug(experience.titre) ] = experience
	})




	// console.log([...new Set(uniqueTeachers.map(item => item.nom))]);
	// console.log( uniqueTeachers.reduce( (acc, cur) => acc.some(x => x.nom === cur.nom)? acc: [...acc, cur ], [] ) )
	// -------------------------------------------------------------------------------


	


	
	data_app.approches 		= lessonsList
	// data_app.admins 		= adminsList
	data_app.etudiants 		= studentsList
	data_app.enseignants 	= teachersList

	// console.log(data_app)
	try {
		fs.writeFileSync( data_file_path , JSON.stringify( data_app , null, '\t' ) )
	} catch (e) {
		console.log(e)
	}

}else{

	try{
		data_app = JSON.parse( fs.readFileSync(data_file_path) )
	}catch (e) {
		console.log(e)
	}

}



var sessionMiddleware = session({
	secret: "keyboard cat",
	resave: true,
	saveUninitialized: true,
	// cookie: { secure: true }
})

var server 		= app.listen(3000, function(){
	console.log("listening on *:3000\n\n\n")
}) 

var io 			= socket(server)
io.use( function (socket, next) {
	sessionMiddleware(socket.request, socket.request.res, next);
})


app.use( sessionMiddleware )
app.use( cookieParser() )
app.use( express.static( __dirname +'/public') )
app.get('/admin', (req, res) => {
	res.sendFile(__dirname + '/private/admin.html');
});
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/private/index.html');
});


io.on('connection', (socket) => {
	console.log('\na user connected')

	socket.emit("hello")

	var req = socket.request

	if(req.session.page_views){
		req.session.page_views++
		req.session.save()
	}else{
		req.session.page_views = 1
		req.session.save()
	}

	console.log( "ID : ",req.sessionID )
	console.log( "first log, session verification : " )
	// console.log(req.session)

	let logged = false

	// console.log( "filename", socket.request.headers.referer.search('admin') )
	let isAdmin = socket.request.headers.referer.search('admin') == -1 ? false : true

	if(req.session.userID != null){
		console.log("\t-> existing userID", req.session.userID)
		if( isAdmin ){
			for (const mail in adminsList) {
			// studentsList.forEach(student => {
				if(mail == req.session.userID){
					logged = true
				}
			}
		}else{
			for (const mail in studentsList) {
			// studentsList.forEach(student => {
				if(mail == req.session.userID){
					logged = true
				}
			}

		}
		if(logged === true){
			socket.emit("login_success", {user: req.session.userID})
		}	
	}else{
		console.log("\t-> no userID")
	}
	console.log("++++")


	socket.on('disconnect', () => {
		// console.log('user disconnected')
	})

	// https://steemit.com/utopian-io/@upmeboost/nodejs--socketio--creating-a-login-system-nvlrmaoy
	// https://www.npmjs.com/package/express-session
	socket.on('login_register', (data) => {

		// console.log( path.basename(socket.request.headers.referer ) )
		isAdmin = socket.request.headers.referer.search('admin') == -1 ? false : true

		const user = data.user,
		password = data.password;

		let logged = false
		if(isAdmin){
			for (const mail in adminsList) {
			// studentsList.forEach((student,index) => {
				if(mail == user && adminsList[mail].password == password){
					logged = true
				}
			}
		}else{
			for (const mail in studentsList) {
			// studentsList.forEach((student,index) => {
				if(mail == user && studentsList[mail].password == password){
					logged = true
				}
			}
		}

		console.log("logged",logged)
		if(logged === false){
			console.log("error")
			socket.emit("login_error")
		} else if(logged === true){
			req.session.userID = user
			req.session.isAdmin = isAdmin
			console.log(req.session)
			req.session.save()
			socket.emit("login_success", {user: user})
		}
	})

	socket.on('logout', (data) => {
		console.log('logout', req.session)
		req.session.destroy()
		socket.emit('logout_success')
	})

	// socket.on('chat message', (msg) => {
	// 	console.log('message: ' + msg)
	// 	io.emit('chat message', msg)
	// })

	socket.on("get_data", (data) => {
		// console.log("get_data",req.session.userID,data_app.etudiants[ req.session.userID ].approches)

		socket.emit("data_approches", data_app.approches)
		socket.emit("data_enseignants", data_app.enseignants)
		if(!isAdmin){
			socket.emit("data_user", data_app.etudiants[ req.session.userID ].approches)
		}
	})

	socket.on("save_resume", (data) => {
		console.log("save_resume",data)

		data_app.approches[ data.approche_id ].enseignants[ data.enseignant_id ].resume = data.resume

		io.emit("update_resume", data)

		try {
			fs.writeFileSync( data_file_path, JSON.stringify( data_app /*, null, '\t'*/ ) )
		} catch (e) {
			console.log(e)
		}
	})

	socket.on("get_inscrits", (data)=>{

		let liste_inscrits = []

		for(const etudiant in data_app.etudiants){
			if(typeof data_app.etudiants[etudiant].approches[data.approche_id] !== 'undefined' && data_app.etudiants[etudiant].approches[data.approche_id] == data.enseignant_id){

				liste_inscrits.push( etudiant )
			}
		}

		socket.emit("data_inscrits", liste_inscrits)
	})


	socket.on("select_approche", (data)=>{
		console.log( data, req.session.userID )

		let message = ""

		


		if( data.choosed == true ){

			if(data.previous_enseignant_id != null){
				data_app.approches[ data.approche_id ].enseignants[ data.previous_enseignant_id ].places ++
			}

			if( data_app.approches[ data.approche_id ].enseignants[ data.enseignant_id ].places > 0 ){
				
				if(typeof req.session.userID == 'undefined'){

					message = "Il y a une erreur avec le compte, contacter Loïc…"

				}else if(typeof data_app.etudiants[ req.session.userID ].approches !== 'undefined'){

					data_app.approches[ data.approche_id ].enseignants[ data.enseignant_id ].places --
					data_app.etudiants[ req.session.userID ].approches[ data.approche_id ] = data.enseignant_id
					message = "L'inscription est validée."

				}else{

					message = "Il y a une erreur, contacter Loïc…"

				}

				
			}else{
				message = "il n'y plus de place"
			}
		}else if( data.choosed == false ){

			if( data_app.approches[ data.approche_id ].enseignants[ data.enseignant_id ].places < data_app.approches[ data.approche_id ].enseignants[ data.enseignant_id ].max_places ){

				delete data_app.etudiants[ req.session.userID ].approches[ data.approche_id ]
				data_app.approches[ data.approche_id ].enseignants[ data.enseignant_id ].places ++	
				

				message = "Désinscription confirmée."
			}
		}

		socket.broadcast.emit("update_approche", {
			approche_id		: data.approche_id,
			enseignant_id	: data.enseignant_id,
			reste 			: data_app.approches[ data.approche_id ].enseignants[ data.enseignant_id ].places,
			enseignants		: data_app.approches[ data.approche_id ].enseignants,
			message 		: ""
		})

		socket.emit("update_approche", {
			approche_id		: data.approche_id,
			enseignant_id	: data.enseignant_id,
			reste 			: data_app.approches[ data.approche_id ].enseignants[ data.enseignant_id ].places,
			enseignants		: data_app.approches[ data.approche_id ].enseignants,
			message 		: message
		})


		try {
			fs.writeFileSync( data_file_path, JSON.stringify( data_app , null, '\t' ) )
		} catch (e) {
			console.log(e)
		}
	})


	socket.broadcast.emit('hi')
	// socket.emit("info","data")
})









// ------------------ OLD ------------------


// const storeData = (data, path) => {
//   try {
//     fs.writeFileSync(path, JSON.stringify(data))
//   } catch (err) {
//     console.error(err)
//   }
// }


