/* global emit */
/* global StatusBar */
/* global PouchDB */
/// <reference path="../typings/angularjs/angular.d.ts"/>
/// <reference path="../typings/cordova/cordova.d.ts"/>
// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js




angular.module('starter', ['ionic', 'starter.controllers', 'angucomplete-alt'])

  .run(function ($ionicPlatform, $state, tracingService) {
    $ionicPlatform.ready(function () {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);

      }
      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }
      tracingService.initDB().then(function (info) {
            $state.go('app.home');
      },function(error){
        console.log(error);
      });
    });
  })

  .config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/menu.html'
      })
      
      .state('app.home', {
        url: '/home',
        views: {
          'menuContent': {
            templateUrl: 'templates/home.html'
          }
        }
        
      })

      .state('app.list', {
        url: '/list',
        views: {
          'menuContent': {
            templateUrl: 'templates/lista_encuestas.html',
            controller: 'ListCtrl'
          }
        }
      })

      .state('app.nueva', {
        url: '/nueva',
        views: {
          'menuContent': {
            templateUrl: 'templates/nueva.html',
            controller: 'AppCtrl'
          }
        }
      })
      .state('app.sync', {
        url: '/sync',
        views: {
          'menuContent': {
            templateUrl: 'templates/sync.html',
            controller: 'SyncCtrl'
          }
        }
      })
      .state('app.settings', {
        url: '/settings',
        views: {
          'menuContent': {
            templateUrl: 'templates/settings.html',
            controller: 'SettingsController'
          }
        }
      })
      .state('app.encuesta', {
        url: '/encuesta/:index',
        views: {
          'menuContent': {
            templateUrl: 'templates/encuesta.html',
            controller: 'EncuestaCtrl'
          }
        }
      });
    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app');
  });


var trancingService = angular.module('starter').factory('tracingService', ['$q', '$http', tracingService]);
function tracingService($q, $http) {
  var _db;

  return {
    //Base de Datos
    initDB: initDB,
    establecerAjustes: establecerAjustes,
    obtenerAjustes: obtenerAjustes,
    
    //Servidor
    ingresar: ingresar,
    
    addEncuesta: addEncuesta,
    getInstrumentos: getInstrumentos,
    login: login,
    syncInstrumentos: syncInstrumentos,
    syncEncuestas: syncEncuestas,
    listEncuestas: listEncuestas,
    eliminarEncuesta: eliminarEncuesta
  }
  //Metodos de consulta con servidor
  function ingresar(ajustes){
    var credenciales;
    if (ajustes == null){
      return $q.reject('No se establecieron los ajustes correspondientes.');
    }else{
      credenciales = {'user': ajustes.usuario, 'password': ajustes.contrasena};
      return $http({method:'POST',url:ajustes.url + '/LogOn',data:credenciales}).then(function(conectado){
        if(conectado.data.estado){
          return {estado: conectado.data.estado, mensaje: conectado.data.mensaje};
        }else{
          return $q.reject({estado: conectado.data.estado, mensaje: conectado.data.mensaje});
        }
      },function(error){
        return $q.reject({estado: false, mensaje: 'Error al conectar con el servidor, verifique la direción o su conexión a internet.', error: error});
      });
    }
  }
  //Metodos Internos
  
  
  //Metodos de Base de datos  
  function initDB() {
    _db = new PouchDB('tracing', { adapter: 'idb' });
    return $q.when(_db.info());
  }
  
  function establecerAjustes(ajustes){
    return _db.get('ajustes').then(function(doc){
      doc.contrasena = ajustes.contrasena;
      doc.usuario = ajustes.usuario;
      doc.url = ajustes.url;      
      return _db.put(doc);
    },function(){
      ajustes._id = 'ajustes';
      return _db.put(ajustes);
    }).then(function(exito){
      return {estado: true, mensaje: 'Ajustes salvados satisfactoriamente.', exito: exito, error: null};
    },function(error){
      return $q.reject({estado: false, mensaje: 'Error al salvar los ajustes.', exito: null, error: error});
    });
  }
  
  function obtenerAjustes(){
    return _db.get('ajustes').then(function(documento){
      return {estado: true, mensaje: 'Ajustes encontrados.', data: documento};
    },function(error){
      return $q.reject({estado: false, mensaje: 'No existen ajustes guardados en este dispositivo', error: error});
    });
  }
  
  
  function login(settings){
    var data = {'user': settings.user, 'password': settings.password};
    return $http({method:'POST',url:settings.url + '/LogOn',data:data});
  }

  function listEncuestas() {    
    return $q.when(_db.query(mapEncuestas, { key: 'es_encuesta', include_docs: true }));
  }

  function addEncuesta(encuesta) {
    encuesta.label = "encuesta";
    return $q.when(_db.post(encuesta));
  }

  
  function mapEncuestas(doc) {
    if (doc.label === 'encuesta') {
      emit('es_encuesta');
    }
  }
  
  function setInstrumentos(instrumentos) {
    instrumentos._id = 'instrumentos';
    _db.put(instrumentos).then(
      function (response) {
        console.log(response);
      });
  }
  
  function syncEncuestas() {
    var salvadoCompleto = true;
    listEncuestas().then(function (result) {
      if (_loggedin) {
        for (var i = 0 ; i < result.rows.length ; i++){
          var salvado = salvarEncuesta(result.rows[i].doc.Instrumento.Id, result.rows[i].doc);
          if (!salvado.salvado){
            salvadoCompleto = false;
          }                  
        }        
      } else {
        login(null, syncEncuestas,null);
      }
    });
    return salvadoCompleto;
  } 
  
  function salvarEncuesta(id, encuesta){
    var saved = false;
    var error = '';
    var data = {
       arg: [''+id,JSON.stringify(encuesta),_settings.user]
    };    
    $http.post(_settings.url + '/SalvarEncuesta', data)
    .success(function (data, status, headers, config) {
      if (data.procesado){
        eliminarEncuesta(encuesta);
        saved = true;
      } else {
        error = data.error;
      }
    });
    return {salvado : saved, error: error}
  }
  
  function eliminarEncuesta(encuesta){
    _db.remove(encuesta._id, encuesta._rev);
  }
  
  function syncInstrumentos() {
    if (_loggedin) {
      $http({
        method: 'GET',
        url: _settings.url + '/Instrumentos'
      })
        .success(function (response) {
          getInstrumentos()
            .catch(function () {
              return {};
            })
            .then(function (instrumentosBD) {
              if (instrumentosBD) {
                instrumentosBD.instrumentos = response.instrumentos;
              }
              setInstrumentos(instrumentosBD);
            });
        })
        .error(function (err) {
          console.log(err);
        })
    } else {
      login(null, syncInstrumentos,null);
    }
  }
  function getInstrumentos() {
    return $q.when(_db.get('instrumentos'));
  }
}