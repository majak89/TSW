/*jshint node: true */
var express = require('express');
var http = require('http');
var path = require('path');
var app = express();
var pola;
app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.static(path.join(__dirname, 'public')));
	app.set('gra', {
		gracz: [
			{'id': 0, 'nazwa': '', 'start': false}, 
			{'id': 1, 'nazwa': '', 'start': false},		 	
		],
		pola: [,,,,,,,,],
		kolejka: null,
		ilosc_graczy: 0
		});
	var gra = app.get('gra');
	gra.pola = new Array(8);
	for(var i=0; i<8; i++){
		gra.pola[i] = new Array(8);
		for(var j=0; j<8; j++){
		 gra.pola[i][j] = null;
			if(i==3 && j==3 || i==4 && j==4){
				gra.pola[i][j] = 0;
			}
			else if (i==3 && j==4 || i==4 && j==3){
				gra.pola[i][j] = 1;
			}
		}
	}
	pola = app.get('gra').pola;
});

var server = http.createServer(app).listen(app.get('port'), function () {
    console.log("Serwer nasłuchuje na porcie " + app.get('port'));
});

var io = require('socket.io');
var socket = io.listen(server);

// Wysyła wiadomość z podaną nazwą do wszystkich
function emitAll(client, nazwa, co) {
	'use strict';
	client.emit(nazwa, co);
	client.broadcast.emit(nazwa, co);
}
// Wysyła wiadomość z podaną nazwą do wszystkich - JSON
function emitAllJSON(client, nazwa, co) {
	'use strict';
	client.json.emit(nazwa, co);
	client.json.broadcast.emit(nazwa, co);
}
// Ustawia kolejkę na następnego gracza
function ZmianaKolejki() {
	'use strict';
	var gra = app.get('gra');
	// Zmiana kolejki na następnego gracza
	if (gra.kolejka < gra.ilosc_graczy - 1) {
		gra.kolejka++;
	} else {
		gra.kolejka = 0;
	}
}

function SumujPionki() { // Sumowanie ile jest pionków białych i czarnych na planszy
	var cza = 0, bia = 0;
	
	for (var i = 0; i < pola.length; i++) {
		for (var j = 0; j < pola[i].length; j++) {
			if (pola[i][j] !== null){ // Pomijanie wartości null
				if(pola[i][j] === 0) { // Jak pole == 0 biały pionek
					bia++;
				} else { // Wartości null są wykluczone, więc jest czarny
					cza++;
				}
			}
		}		
	}
	
	return {
		black: cza,
		white: bia
	};
}

function CzyKoniec(ruchy) {
	// jak białe == 0 lub czarne == 0 -> koniec gry
	// jak białe + czarne == max (64) -> koniec gry
	var suma = SumujPionki(),
		wygrany = "",
		id = false;
	
	if(suma.black === 0 || suma.white === 0 || suma.black + suma.white === 64
		|| typeof ruchy !== "undefined" && ruchy.white === 0 && ruchy.black === 0) {
		// koniec gry jeden z graczy nie ma pionków, lub plansza zapełniona
		if (suma.black > suma.white){
			wygrany = "Wygrał czarny.";
			id = 1;
		} else if (suma.black < suma.white){
			wygrany = "Wygrał biały.";
			id = 0;
		} else {
			wygrany = "Remis";
			id = 2
		}
		
		return id;
	}
	return false;
}

function SprawdzWykonajRuch(y, x, id, wykonaj) { // Sprawdza czy ruch jest możliwy (zwraca true/false) i zmienia odpowiednie pola
	// x,y pole wg którego sprawdzane są kierunki
	// id gracza, określa też kolor
	var zmieniono = false;
	// Sprawdzanie kierunków Jak pole istnieje (wykrywanie krawędzi i nie jest puste) bada dany kierunek
	// 1 2 3	Kolejność warunków
	// 8 * 4	Ruch jest możliwy do wykonania gdy conajmniej jeden kierunek zostaje zmieniony
	// 7 6 5
	if (y - 1 >= 0 && x - 1 >= 0 && pola[y - 1][x - 1] !== null ){ // g l
		if (SprawdzKierunek(y, x, -1, -1, id, wykonaj)) {
			zmieniono = true;
		}
	}
	if (y - 1 >= 0 && pola[y - 1][x] !== null){ // g ś
		if (SprawdzKierunek(y, x, -1, 0, id, wykonaj)) {
			zmieniono = true;
		}
	}
	if (y - 1 >= 0 && x + 1 < pola.length && pola[y - 1][x + 1] !== null){ // g p
		if (SprawdzKierunek(y, x, -1, 1, id, wykonaj)) {
			zmieniono = true;
		}
	}
	if (x + 1 < pola.length && pola[y][x + 1] !== null){ // ś p
		if (SprawdzKierunek(y, x, 0, 1, id, wykonaj)) {
			zmieniono = true;
		}
	}
	
	if (y + 1 < pola.length && x + 1 < pola.length && pola[y + 1][x + 1] !== null){ // d p
		if (SprawdzKierunek(y, x, 1, 1, id, wykonaj)) {
			zmieniono = true;
		}
	}
	if (y + 1 < pola.length && pola[y + 1][x] !== null){ // d ś
		if (SprawdzKierunek(y, x, 1, 0, id, wykonaj)) {
			zmieniono = true;
		}
	}
	if (y + 1 < pola.length && x - 1 >= 0 && pola[y + 1][x - 1] !== null){ // d p
		if (SprawdzKierunek(y, x, 1, -1, id, wykonaj)) {
			zmieniono = true;
		}
	}
	if (x - 1 >= 0 && pola[y][x - 1] !== null){ // ś l
		if (SprawdzKierunek(y, x, 0, -1, id, wykonaj)) {
			zmieniono = true;
		}
	}
	
	return zmieniono;
}

function SprawdzKierunek(y, x, dy, dx, id, zamien) {
	var zmienionych = 0, // przechowuje ile jest pionów przeciwnika do zmiany
		sx = x, sy = y; //Pole startu
	// Jak kolejne pole istnieje i nie jest puste i ma pionek przeciwnika
	while ((y + dy >= 0 && y + dy < pola.length) && (x + dx >= 0 && x + dx < pola.length)
		 && pola[y + dy][x + dx] !== null && pola[y + dy][x + dx] !== id) {
		// zamiana dopiero jak wiemy, że na końcu jest własny pionek
		// następne pole do sprawdzenia
		y = y + dy; //następne pole
		x = x + dx; //następne pole
		zmienionych++; // Dodanie pionka
	}
	// Jak jakikolwiek pionek należy do przeciwnika,
	// Jak istnieje pole (mniej niż 0 i więcej niż 7)	sprawdzamy czy na końcu jest pion własny
	if (zmienionych > 0
	&& (y + dy >= 0 && y + dy < pola.length) && (x + dx >= 0 && x + dx < pola.length)
	&& pola[y + dy][x + dx] == id) {
		// Od pola klikniętego zaczynamy zmieniać pionki na własne
		if(zamien === true) {
			y = sy; x = sx;
			// Ten sam warunek co w pętli powyżej, tylko w tej zamieniamy pionki
			while ((y + dy >= 0 && y + dy < pola.length) && (x + dx >= 0 && x + dx < pola.length)
			 && pola[y + dy][x + dx] !== null && pola[y + dy][x + dx] !== id) {
				pola[y + dy][x + dx] = id; // Zamiana pionka na przeciwny
				y = y + dy; // następne pole
				x = x + dx; // następne pole
			}
		}
		return true;
	} 
	return false;
}
	
function MozliwyRuch() {

	var cza = 0, bia = 0;
	
	for (var i = 0; i < pola.length; i++) {
		for (var j = 0; j < pola[i].length; j++) {
		
			if (pola[i][j] === null){ // Sprawdzanie tylko pustych pól
				if (SprawdzWykonajRuch(i, j, 0, false) === true) { // Jak false biały nie może wykonać ruchu z tego pola
					bia++; // Można wykonać ruch
				}
				if (SprawdzWykonajRuch(i, j, 1, false) === true) { // to samo dla czarnego
					cza++;
				}
			}
		}		
	}
	
	return {
		white: bia,
		black: cza
	};
}
	
	
socket.on('connection', function (client) {
    'use strict';
    var username;
	var id = null;
	var incoming;
	var gra = app.get('gra');
	console.log(gra.pola);
	
    client.on('message', function (msg) {
        if (id == null) {
			incoming = JSON.parse(msg);
			if (incoming.nick != null && gra.ilosc_graczy < 2) {
				id = gra.ilosc_graczy;
				gra.ilosc_graczy++;
				username = incoming.nick;
				gra.gracz[id].nazwa = incoming.nick;

				client.json.emit('json', '{"gracze":' + JSON.stringify(gra) + ', "myid": ' + id + '}');
				client.json.broadcast.emit('json', '{"gracze":' + JSON.stringify(gra) + ', "id": ' + id + '}');

				client.json.send('{"msg": "Witaj ' + username + '","myid":' + id + '}');
				client.json.broadcast.emit('message', '{"msg": "Nowy użytkownik: ' + username + '","id":' + id + '}');
			}
			
            return;
        }
			incoming = JSON.parse(msg);
			if (incoming.msg != null) {
					
				emitAllJSON(client, 'message', '{"gracz": ' + id + ', "msg": "' + incoming.msg +'"}');
			}

    });
	
	client.on('start', function (msg) {
		if (id < 2) {
			gra.gracz[id].start = true;
			var ilosc = 0;
			for (var i =0; i<2; i++) { // Sumowanie graczy z klikniętym start
				if(gra.gracz[i].start === true){
					ilosc++;
				}
			}
			console.log("start: %d", ilosc);
			if(ilosc === gra.ilosc_graczy && gra.ilosc_graczy === 2 ){ // Jak jest komplet graczy włączamy grę
				emitAll(client, 'start', id);
				gra.kolejka = 1; // Zaczynają czarne
			}
		}
	});
	
	client.on('ruch', function(msg) { 
		var pola = app.get('gra').pola;
		incoming = JSON.parse(msg);
		console.log("msg: %o, pola: %o", incoming);
		
		if(id === gra.kolejka && pola[incoming.pole.y][incoming.pole.x] === null 
			&& SprawdzWykonajRuch(incoming.pole.y, incoming.pole.x, id, true)) { // Jak gracz ma kolejkę, pole jest puste i ruch jest możliwy 
			
			client.json.broadcast.emit('ruch', incoming); // Wysłanie informacji o ruchu dla drugiego gracza
			pola[incoming.pole.y][incoming.pole.x] = id; // Ustwienie pionka w danym miejscu
			
			var ruchy = MozliwyRuch(); // Sprawdzanie czy ruchy są możliwe
			var koniec = CzyKoniec(ruchy); // Sprawdzenie czy gra się zakończyła
			if(id === 1 && ruchy.white > 0 || id === 0 && ruchy.black > 0) { // Jak gracz ma możliwość ruchu, zmieniamy kolejkę
			
				ZmianaKolejki();
			}
			else {
				if (ruchy.white !== 0 || ruchy.black !== 0)  // Jak jeden z graczy ma możliwość ruchu, a drugi nie, traci kolejkę
					emitAllJSON(client, 'blok', ruchy);
				
			}
			if(koniec !== false){ // Gra jest już zakończona
				emitAllJSON(client, 'koniec', koniec);
			}
		}
		else {
			console.log("Gracz nie ma kolejki: " + id + " || pole zajęte || ruch nie możliwy do wykonania ");
		}
	});
	
});