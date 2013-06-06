/*jshint node: true, browser: true, jquery: true */
/*global io: false */


var gra;
var pola = new Array(8);
var plotno;
var szerokosc;
var pole;
var debug = true;//Do debugowania

function writeMessage(message) {
	var context = $('#plotno')[0].getContext('2d');
	context.clearRect(0, 0, $('#plotno').width, $('#plotno').height);
	Draw();
	context.font = '14pt Calibri';
	context.fillStyle = 'black';
	context.fillText(message, 10, 25);
}
	  
function getMousePos(evt) {	// Pobiera pozycje kursora i oblicza pozycje wg płótna
	var rect = $('#plotno')[0].getBoundingClientRect();// pobranie pozycji gdzie zaczyna się canvas
	return {
		x: evt.clientX - rect.left, // Wyliczenie pozycji w canvas
		y: evt.clientY - rect.top
	};
}

function getNrPola(evt){ // Zamiana pozycji myszy na nr pola
	var mousePos = getMousePos(evt); // pobiera pozycje myszy
	return {
		x: parseInt(mousePos.x / pole), //pixele przeliczam na pola
		y: parseInt(mousePos.y / pole)
	};
}
  
function RysujPole(i,j,pole,kontekst){ // Rysuje puste pole na podanym miejscu
	kontekst.fillRect(j*pole, i*pole, pole-1, pole-1);
	kontekst.strokeRect(j*pole, i*pole, pole-2, pole-2);	
}
function RysujPionek(i,j,pole,kontekst){ // Rysuje pionek na podanym miejscu
	kontekst.beginPath(); // Zacznij ścieżkę
	kontekst.arc(j*pole+(pole/2)-1,i*pole+(pole/2)-1, (pole)/2-6, 0, 2*Math.PI, true);
	kontekst.closePath(); // Zamknij
	kontekst.fill(); // Wypełnij
	kontekst.stroke(); // Narysuj kreskę
}
	

function Draw() {
	if(plotno.getContext) {
		var kontekst = plotno.getContext('2d');
		
		kontekst.clearRect(0, 0, plotno.width, plotno.height);
		
		kontekst.strokeStyle = "rgb(0, 0, 0)";
		kontekst.fillStyle = "#468246";
		
		kontekst.font = "14pt Arial";
		kontekst.textBaseline = "middle";
		
		var gracz_s = [ "rgb(25, 22, 15)", "rgb(5, 50, 75)"]; // kolor lini naokoło pionka
		var gracz_f = [ "rgb(250, 220, 150)", "rgb(10, 200, 250)"]; // wypełnienie pionków gracz 1,2

		for(var i=0; i<8; i++){
			for(var j=0; j<8; j++){
				RysujPole(i,j,pole,kontekst);
				if(pola[i][j] != null && pola[i][j] === 0){ // Rysujemy biały pionek
					kontekst.save();
					kontekst.strokeStyle = "#fff";
					kontekst.lineWidth = 3;
					kontekst.fillStyle = "#dfdfdf";
					RysujPionek(i,j,pole,kontekst);
					
					kontekst.restore();
				}
				else if ( pola[i][j] === 1){ // Rysujemy czarny pionek
					kontekst.save();
					kontekst.strokeStyle = "#000";
					kontekst.lineWidth = 3;
					kontekst.fillStyle = "#222";
					RysujPionek(i,j,pole,kontekst);
					
					kontekst.restore();
				}
				else {
				
				}
			}			
		}
	}
}


function WyswietlWiadomosc(tekst){ // Dodanie kolejnej wiadomości i przewijanie listy
	$('#log ul').append('<li>' + tekst + '</li>');
	// przewijanie na dół
	$('#log').scrollTop($('#log')[0].scrollHeight);
}
function Kolor(id) {
	if(id === 0){
		return "biały";
	} else if (id === 1) {
		return "czarny";
	}
	return "";
}

$(document).ready(function () {
    'use strict';
	console.debug(window.location.host);
	
    var socket = io.connect('http://'+window.location.host), // Ustawienie połączenia na aktualny host
        entry_el = $('#entry'),
		input_msg = $('#msg'),
		input_start = $('#start');
	
	var username = null,
		id = null;
	
	input_start.hide(); 
	
	// Uzupełnienie tablicy pól
	for(var i = 0; i < 8; i++){
		pola[i] = new Array(8);
		for(var j = 0; j < 8; j++){
		 pola[i][j] = null;
			if(i==3 && j==3 || i==4 && j==4){ // Postawienie białych pionków na środku planszy
				pola[i][j] = 0;
			}
			else if (i==3 && j==4 || i==4 && j==3){ // Postawienie czarnych pionków na środku planszy
				pola[i][j] = 1;
			}
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
	
	function CzyKoniec(ruchy) { // ruchy obiekt z ilością możliwych ruchów dla graczy
		// jak białe == 0 lub czarne == 0 -> koniec gry
		// jak białe + czarne == max (64) -> koniec gry
		var suma = SumujPionki(),
			wygrany = "";
		
		if(suma.black === 0 || suma.white === 0 || suma.black + suma.white === 64
			|| typeof ruchy !== "undefinied" && ruchy.white === 0 && ruchy.black === 0) {
			// koniec gry jeden z graczy nie ma pionków, lub plansza zapełniona
			if (suma.black > suma.white){
				wygrany = "Wygrał czarny.";
			} else if (suma.black < suma.white){
				wygrany = "Wygrał biały.";
			} else {
				wygrany = "Remis";
			}
			
			$('#wynik').html("Koniec gry. " + wygrany);
			return true;
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
			y = y + dy;
			x = x + dx;
			zmienionych++; // Dodanie pionka
		}
		// Jak jakikolwiek pionek należy do przeciwnika,
		//	Jak istnieje pole (mniej niż 0 i więcej niż 7)	sprawdzamy czy na końcu jest pion własny
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
	

	
	plotno = $('#plotno')[0];
	szerokosc = $('#plotno').width();
	pole = szerokosc / 8; // Wyliczenie szerokości pola
	
	Draw();
	
    console.log('Łączenie…');

    socket.on('connect', function () {
        console.log('Połączony!');
		$('#panel').show();
    });
    socket.on('disconnect', function () {
        console.log('Rozłączony!');
		username = false;
    });

    socket.on('message', function (msg) {
		var data = JSON.parse(msg);
        if (debug) console.debug('recv gracz: %s, msg json: %o ', data.gracz,data);
		// Jak dostajemy id gracza:
		if(data.gracz >= 0){ // Wiadomość od gracza
			// Pobieramy nick i zapisujemy do zmiennej z kodem html
			var nick_gracza = "<span class='uname'>" + gra.gracz[data.gracz].nazwa + "</span>: ";		
		}
		else { // Nick pusty
			var nick_gracza="";
		}
		if(data.myid >= 0){ // Jak dostajemy nasze id, to wypada zapisać
			id = data.myid;
		}
		// Zamiana znaków na zamienniki - uniemożliwia wstrzyknięcie kodu
        var datamsg = data.msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		// Pokazanie wiadomości
        WyswietlWiadomosc(nick_gracza + "" + datamsg);
        entry_el.focus(); 
    });
	
	function PodswietlRuch(id){ // Zamiana podświetlegogo diva, oznaczającego posiadanie kolejki
		if (id === 0) {
			$("#black").removeClass("ruch");
			$("#white").addClass("ruch");
		} else {
			$("#white").removeClass("ruch");
			$("#black").addClass("ruch");
		}
	}
	
	 socket.on('json', function (msg) {
        var data = JSON.parse(msg);
        if (debug) console.debug('recv json: %o ', data);
		gra = data.gracze; // Zapisanie tabeli graczy
		if(username && id == null){
			id = data.myid;
			var color = (id === 0) ? 'white' : 'black';
			
			$("#" + color + "").addClass("ja");// Dodaje klasę, pogrubia nick aktualnego gracza + border
			
		}
		
			
			
	});
	
	input_msg.click(function (event) { // Wyślij mój nick na serwer w pierwszej wiadomości, kolejne to czat
		if (!username) { // Jak nie ma ustawionego pseudonimu
			var msg = entry_el.attr('value'); // Pobranie z formularza nicka
			if (msg) { // Jak nie jest pusty
				username = msg; // Zapisz nazwę do zmiennej globalnej
				var obj = jQuery.parseJSON('{"nick": "'+msg+'"}'); // Utwórz wiadomość dla serwera
				socket.send(JSON.stringify(obj)); // Wyślij wiadomość do serwera
				entry_el.attr('value', ''); // Wyczyść pole formularza
				
				input_start.show(); // Pokaż przycisk start
				$("#console span").html("Wiadomość:"); // Zmień opis pola
			}
		}
		else {
			var msg = entry_el.attr('value'); // Pobranie z formularza wiadamości
			if (msg) { // Jak wiadomość nie jest pusta
				
				var obj = jQuery.parseJSON('{"msg": "'+msg+'"}'); // Utwórz wiadomość dla serwera
				socket.send(JSON.stringify(obj)); // Wyślij wiadomość do serwera
				if (debug) console.debug('msg send: %o', obj);
				entry_el.attr('value', ''); // Wyczyść pole formularza
			}
		}
			
	});
	
	input_start.click(function (event) { 
		socket.emit("start", true); // Wysyłamy na serwer wiadomość start
		input_start.hide();// Ukryj przycisk start, nie jest już potrzebny
	});
	
	socket.on('start', function (msg) {
		if (debug) console.debug('recv start id: %d', id);
        
		WyswietlWiadomosc("Gra się rozpoczęła. Jesteś: " + Kolor(id) + ", pogrubiony na liście powyżej.");
		gra.kolejka = 1;	// Czarne zaczynają
		PodswietlRuch(gra.kolejka); // Poinformuj ładnie zmieniając styl na tablicy wyników
		if (id === 1){
			WyswietlWiadomosc("Zaczynasz grę. Podświetlony na liście powyżej oznacza kolejkę.");
		} else {
			WyswietlWiadomosc("Ruch przeciwnika. Podświetlony na liście powyżej oznacza kolejkę.");
		}
	});
	
	
	// dodanie do canvas funkcji obsługującej kliknięcie myszy
	plotno.addEventListener('mouseup', function(evt) {0
		var poleXY = getNrPola(evt);	// Pobranie numeru pola	
		Draw();// Odrysuj planszę
		var message = 'x,y: ' + poleXY.x  + ',' + poleXY.y + '';		
		if (debug) writeMessage(message); // Do celów testowych rysowanie nr-ów pola 
		// Jak nie są puste id i username oraz kolejka jest oznaczona, gra jest w toku
		if(id !== null && username !== null && gra.kolejka !== null) {
		
			// jak jest nasza kolej i kliknięte pole jest puste
			if(id === gra.kolejka && pola[poleXY.y][poleXY.x] === null) {
			
				// Sprawdź funkcją czy ruch jest możliwy do wykonania, jak tak:
				if(SprawdzWykonajRuch(poleXY.y, poleXY.x, id, true) !== false){
				
					pola[poleXY.y][poleXY.x] = id; // Ustaw pionek na polu
					Draw(); // Narysuj zmienioną planszę i wyślij gdzie postawiono pionek na serwer
					if (debug) console.debug('send ruch: %o, id: %d', poleXY, id);
					socket.json.emit("ruch", '{"pole":' + JSON.stringify(poleXY) + ', "id": ' + id + '}');
					
					$('#wynik').html("Ruch ok."); // Poinformuj o wykonanym poprawnie ruchu
					var p = SumujPionki(); // Zlicz ilość pionków i pokaż w odpowiednim miejscu na stronie
					$("#black span").html("Czarnych: " + p.black);
					$("#white span").html("Białych: " + p.white);
					
					var ruchy = MozliwyRuch();
					
					if (CzyKoniec(ruchy) === false && (id === 1 && ruchy.white > 0) || (id === 0 && ruchy.black > 0)){ // Sprawdź czy gra nie jest skończona
					
						// Zmiana kolejki lokalnie
						if(id === 0) { 
							gra.kolejka = 1;
						} else {
							gra.kolejka = 0;
						}
						PodswietlRuch(gra.kolejka); // Podświetl odpowiedni div w panelu oznaczający kolejkę
					}
					else {
						if (ruchy.white === 0 && ruchy.black === 0) console.debug("S: koniec");
						console.debug("S:Nie zmieniam kolejki. ruchy: %o, kolej: %d", ruchy, gra.kolejka);
					}
				}
				else {
					$('#wynik').html("Nie możesz tu postawić pionka."); // Ruch nie jest możliwy
				}
			}
		}
		
		var message = 'x,y: ' + poleXY.x  + ',' + poleXY.y + '';		
		if (debug) writeMessage(message);
		
		
	}, false);
	
	socket.on('ruch', function (msg) {
		if (debug) console.debug('recv ruch: %o', msg);
		$('#wynik').html("");
		if(SprawdzWykonajRuch(msg.pole.y, msg.pole.x, msg.id, true)){ // sprawdź poprawność danych i zamień pola odpowiednio
		
			pola[msg.pole.y][msg.pole.x] = msg.id; // Ustaw pionek przeciwnika
			Draw(); // narysuj zmienioną planszę
			
			var p = SumujPionki(); // Zlicz ilość pionków i pokaż w odpowiednim miejscu na stronie
			$("#black span").html("Czarnych: " + p.black);
			$("#white span").html("Białych: " + p.white);
			
			var ruchy = MozliwyRuch();
			if (CzyKoniec(ruchy) === false && (msg.id === 1 && ruchy.white > 0) || (msg.id === 0 && ruchy.black > 0)){ // Sprawdź czy gra nie jest skończona
					
				if(gra.kolejka !== id) { // Zmiena kolejki
					gra.kolejka = id;			
				}
				PodswietlRuch(gra.kolejka); // Podświetl odpowiedni div w panelu oznaczający kolejkę
			}
			else {
				console.debug("R:Nie zmieniam kolejki. ruchy: %o, kolej: %d", ruchy, gra.kolejka);
			}
		}
	});
	
	socket.on('blok', function (msg) {
		if (debug) console.debug('recv blok: %o', msg);
		
		if (msg.white === 0) { // biały zablokowany
			gra.kolejka = 1;
			$('#wynik').html("Białe zablokowane.");
			if (id === 0) WyswietlWiadomosc("Tracisz kolejkę!");
			PodswietlRuch(gra.kolejka);
			
		} else if (msg.black == 0) { // czarny zablokowany
			gra.kolejka = 0;
			$('#wynik').html("Czarne zablokowane.");
			if (id === 1) WyswietlWiadomosc("Tracisz kolejkę!");
			PodswietlRuch(gra.kolejka);
			
		}
		
		
	});
	
	socket.on('koniec', function (msg) {
		if (debug) console.debug('recv koniec: %o', msg);
		var ruchy = MozliwyRuch();
		CzyKoniec(ruchy);
	});
	
    entry_el.keypress(function (event) {
        if (event.keyCode !== 13) {
            return;
        }
        input_msg.focus();
     });
});