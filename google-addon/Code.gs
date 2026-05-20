var API_URL = 'https://room-booking-production-18f7.up.railway.app';
var API_KEY = PropertiesService.getScriptProperties().getProperty('ADDON_API_KEY');

function onHomepage(e) {
  return buildCard(e);
}

function onCalendarEventOpen(e) {
  return buildCard(e);
}

function buildCard(e) {
  var date = '';
  var startTime = '';
  var endTime = '';

  if (e && e.calendar && e.calendar.startTime) {
    var start = new Date(e.calendar.startTime);
    var end = new Date(e.calendar.endTime);
    date = Utilities.formatDate(start, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
    startTime = Utilities.formatDate(start, 'America/Argentina/Buenos_Aires', 'HH:mm');
    endTime = Utilities.formatDate(end, 'America/Argentina/Buenos_Aires', 'HH:mm');
  }

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Reserva de Salas').setSubtitle('Atlas / FilmSuez'));

  if (!date) {
    var section = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText('Abrí este panel desde un evento del calendario para ver disponibilidad.'));
    return card.addSection(section).build();
  }

  var availability = getAvailability(date);
  if (!availability) {
    var section = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText('Error al cargar disponibilidad.'));
    return card.addSection(section).build();
  }

  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText('📅 ' + date + '  🕐 ' + startTime + ' – ' + endTime)));

  for (var i = 0; i < availability.length; i++) {
    var room = availability[i];
    var isAvailable = checkAvailable(room, startTime, endTime);
    var section = CardService.newCardSection().setHeader(room.name);

    if (!isAvailable.available) {
      section.addWidget(CardService.newTextParagraph().setText('🔴 Ocupada: ' + isAvailable.reason));
    } else {
      section.addWidget(CardService.newTextParagraph().setText('🟢 Disponible'));
      var btn = CardService.newTextButton()
        .setText('Reservar ' + room.name)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('bookRoom')
          .setParameters({
            room_id: room.id,
            room_name: room.name,
            date: date,
            start_time: startTime,
            end_time: endTime
          }));
      section.addWidget(btn);
    }
    card.addSection(section);
  }

  return card.build();
}

function checkAvailable(room, startTime, endTime) {
  for (var i = 0; i < room.blocked.length; i++) {
    var b = room.blocked[i];
    if (startTime < b.end && endTime > b.start) {
      return { available: false, reason: b.reason };
    }
  }
  for (var j = 0; j < room.bookings.length; j++) {
    var bk = room.bookings[j];
    if (startTime < bk.end_time.substring(0,5) && endTime > bk.start_time.substring(0,5)) {
      return { available: false, reason: bk.title + ' (' + bk.user_name + ')' };
    }
  }
  return { available: true };
}

function getAvailability(date) {
  try {
    var response = UrlFetchApp.fetch(API_URL + '/api/addon/availability?date=' + date, {
      headers: { 'x-addon-key': API_KEY },
      muteHttpExceptions: true
    });
    return JSON.parse(response.getContentText());
  } catch (e) {
    return null;
  }
}

function bookRoom(e) {
  var params = e.parameters;
  var user = Session.getActiveUser().getEmail();

  try {
    var response = UrlFetchApp.fetch(API_URL + '/api/addon/book', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-addon-key': API_KEY },
      payload: JSON.stringify({
        room_id: params.room_id,
        date: params.date,
        start_time: params.start_time,
        end_time: params.end_time,
        title: 'Reunión',
        user_name: user,
        user_email: user
      }),
      muteHttpExceptions: true
    });

    var status = response.getResponseCode();
    if (status === 201) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('✅ ' + params.room_name + ' reservada'))
        .setStateChanged(true)
        .build();
    } else if (status === 409) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('❌ El horario ya fue reservado'))
        .build();
    } else {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('❌ Error al reservar'))
        .build();
    }
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('❌ Error de conexión'))
      .build();
  }
}
