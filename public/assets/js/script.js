var socket = io()


Vue.component('approche-comp', {
	template: '#approche-template',
	props: [
		'titre',
		'date',
		'enseignants',
		'id',
		'validated',
	],
	data:function(){
			return {toggle:false}
	},
	methods:{
		select_approche:function(approche_id, enseignant_id){
			// this.valid = true
			app.update_approche_teacher(approche_id, enseignant_id)
		}
	}
})


var data_app = {
	logged: false,
	email:'',
	message: 'Hello Vue!',
	opacity:0,
	approches:{},
	enseignants:{},
}


var app = new Vue({
	el: '#app',
	data: data_app,
	methods: {
		login : function () {
			// console.log(
			// 	this.logged, 
			// 	document.querySelector("input[name=email]").value , 
			// 	document.querySelector("input[name=password]").value 
			// )
			socket.emit("login_register", {
				user: document.querySelector("input[name=email]").value ,
				password: document.querySelector("input[name=password]").value
			})
		},
		logout : function(){
			// console.log("logout clicked")
			socket.emit("logout")
		},
		login_success : function(json){
			// console.log("logged")
			this.logged = true
			this.email = json.user

			this.update_data()
		},
		logout_succes : function(){
			// this.logged = false
			window.location.href = "/"
			// document.querySelector("input[name=email]").value  = ""
			// document.querySelector("input[name=password]").value = ""
		},
		update_data:function(){
			socket.emit("get_data")
		},
		received_data_approches:function(json){
			// console.log("approches",json)
			data_app.approches = json
		},
		update_data_approche:function(json){
			// console.log("json",json)

			for(enseignant in json.enseignants){
				// console.log("test",enseignant)
				data_app.approches[ json.approche_id ].enseignants[ enseignant ].places = json.enseignants[enseignant].places
			}
			if(json.message != ""){
				this.update_message(json.message)
			}

			this.update_active_teachers()
		},
		received_data_enseignants:function(json){
			// console.log("enseignants",json)
			data_app.enseignants = json
		},
		update_approche_teacher:function(approche_id, enseignant_id){

			if(data_app.approches[ approche_id ].enseignants[ enseignant_id ].places > 0 ){

				let previous_enseignant_id = null

				for(enseignant in data_app.approches[ approche_id ].enseignants){
					if(data_app.approches[ approche_id ].enseignants[ enseignant ].selected == true){
						previous_enseignant_id = enseignant
					}
				}

				if( data_app.approches[ approche_id ].enseignants[ enseignant_id ].selected == true ){
					data_app.approches[ approche_id ].enseignants[ enseignant_id ].selected = false
				}else{
					for(enseignant in data_app.approches[ approche_id ].enseignants){
						data_app.approches[ approche_id ].enseignants[ enseignant ].selected = false
					}
					data_app.approches[ approche_id ].enseignants[ enseignant_id ].selected = true
				}

				let choosed = false

				if( data_app.approches[ approche_id ].enseignants[ enseignant_id ].selected == true){
					choosed = true
				}

				data_app.approches[ approche_id ].validated = choosed

				// console.log(approche_id, enseignant_id, this.enseignants)
				socket.emit("select_approche",{
					"approche_id":approche_id, 
					"enseignant_id":enseignant_id, 
					"previous_enseignant_id":previous_enseignant_id,
					"choosed": choosed
				})

				this.update_active_teachers()
			}else{
				this.update_message("Il n'y a plus de place ! Veuillez choisir une autre approche.")
			}
		},
		received_data_user:function(json){
			// console.log("data_user",json)

			for(approche in json){
				data_app.approches[ approche ].validated = true
				data_app.approches[ approche ].enseignants[ json[approche] ].selected = true
			}

			this.update_active_teachers()
		},
		update_active_teachers:function(){

			for(teacher in data_app.enseignants){
				data_app.enseignants[teacher].active = false
			}

			for( approche in data_app.approches ){
				for(teacher in data_app.approches[approche].enseignants){
					if( data_app.approches[approche].enseignants[teacher].selected == true){
						data_app.enseignants[teacher].active = true
					}
				}
			}
		},
		update_message:function(message){
			data_app.message = message
			data_app.opacity = 1

			setTimeout( function(){
				data_app.opacity = 0
			},4000)
		}
	},
	mounted: function(){
		console.log("App ready")
	}
})




socket.on("login_success", function(json){
	// console.log( "login_success" )
	app.login_success(json)
})

socket.on("logout_success", function(json){
	// console.log( "logout_success" )
	app.logout_succes()
})

socket.on("login_invalid", function(){
	app.update_message("Username / Password Invalid, Please try again!")
	// app.logout()
});

socket.on("login_error", function(){
	app.update_message("Error: Please try again!")
	// app.logout()
})

socket.on("data_approches", function(json){
	// console.log("data_approches", data)
	app.received_data_approches(json)
})

socket.on("update_approche", function(json){
	// console.log("data_approches", data)
	app.update_data_approche(json)
})

socket.on("data_enseignants", function(json){
	// console.log("data_enseignants", data)
	app.received_data_enseignants(json)
})

socket.on("data_user", function(json){
	// console.log("data_enseignants", data)
	app.received_data_user(json)
})