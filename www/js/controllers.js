angular.module('starter.controllers', [])
/*
Controller de Configuaracion  
*/
.controller('SettingsController',function ($scope,$ionicLoading,$ionicPopup,tracingService) {
  //Variables  
  $scope.Ajustes = {};
  $scope.Mensajes = [];
  $scope.Titulo = ''; 
  //Metodos
  $scope.$on('$ionicView.enter', function() {
    $scope.Ajustes = {url: '',usuario: '',contrasena: ''};
    $scope.Mensajes = [];
    $scope.Titulo = ''; 
    tracingService.obtenerAjustes().then(function(ajustes){
      $scope.Ajustes = ajustes.data;
      $scope.apply();  
    });    
  });
  
  $scope.autenticarYSalvar = function(){
    $ionicLoading.show({template: 'Autenticando...'});
    $scope.Mensajes = [];
    $scope.Titulo = ''; 
    
    tracingService.ingresar($scope.Ajustes).then(function(ingresado){
      $scope.Mensajes.push(ingresado.mensaje);
      $ionicLoading.show({template: 'Salvando Ajustes...'});
      return tracingService.establecerAjustes($scope.Ajustes);
    }).then(function(salvado){
      $scope.Titulo = 'Bien!';
      $scope.Mensajes.push(salvado.mensaje);
    },function(error){
      $scope.Titulo = 'Oops!';
      $scope.Mensajes.push(error.mensaje);
    }).then(function(){
      $ionicLoading.hide();
      $scope.showAlert();
    });
  }
  
 $scope.showAlert = function() {
   var alertPopup = $ionicPopup.alert({
     title: $scope.Titulo,
     template: '<div ng-repeat="mensaje in Mensajes track by $index"> * {{mensaje}}</div>',
     scope: $scope
   });
   alertPopup.then(function(res) {
     console.log('Complete!');
   });
 };
})
/*
Controller para Sincronizar  
*/  
.controller('SyncCtrl',function ($scope,$ionicLoading,$state,tracingService) {
  //Variables
  $scope.Estado = {conexion:'Desconectado', sincronizacion:'No se ha sincronizado', encuestas:0};
  
  //Metodos      
  $scope.$on('$ionicView.enter', function() {
    tracingService.getSettings().then(function(success){
      return tracingService.login(success);
    },function(error){
      $state.go('app.settings');
    }).then(function(success){
      $scope.Estado.conexion = 'Conectado';
      $scope.$apply();
    },function(error){
      $scope.Estado.conexion = 'Desconectado';
      $scope.$apply();
    });
    
    tracingService.listEncuestas().then(function(success){
      $scope.Estado.encuestas = success.total_rows;
      $scope.$apply();
    },function(error){
      console.log(error);
    });
  });
  
  
  $scope.Sincronizar = function () {
    
    var encuestasPendientes = 0;
    
    if(tracingService.isloggedIn()){
      tracingService.listEncuestas().then(function (result) {
        encuestasPendientes = result.rows.length;
        if (encuestasPendientes > 0){
          var salvado = tracingService.syncEncuestas();
          if (salvado){
            $scope.salvadoExitoso();
          } else {
            $scope.errorEncuesta();
          }
        }
      });                                     
      tracingService.syncInstrumentos();          
    }else{
      tracingService.login(null,$scope.Sincronizar,$scope.errorConexion);
    }        
  }
})

/*
Main Controller  
*/  
.controller('AppCtrl',function ($scope, $state, tracingService) {
  //Variables
  $scope.instrumentos = [];
  //Metodos
  $scope.$on('$ionicView.enter',function(){
    tracingService.getSettings().then(function(success){
      return tracingService.getInstrumentos();
    },function(error){
      $state.go('app.settings');
    }).then(function(success){
      console.log(success);
      //$scope.instrumentos = success.instrumentos;
    },function(error){
      console.log(error);
    });
  });
      
      $scope.capturar = function (index) {
        $state.go('app.encuesta', { "index": index });
      }
})
    
   



  .controller('ListCtrl',
    function($scope,$ionicLoading,$ionicPopup, tracingService){
      $scope.$on('$ionicView.enter', function() {
        $ionicLoading.show({
          template: 'Loading...'
        });
                    
        $scope.actualizarLista = function () {
          tracingService.listEncuestas().then(function(result){
            $scope.Lista=result.rows;
            $scope.mostrarEliminar();
            $ionicLoading.hide();
          });
          return true;
        }
      
        $scope.Incializar = $scope.actualizarLista();        
      });
      //variables de control
      $scope.PuedeEliminar = false;   
      
      //Funciones de la vista           
      $scope.mostrarEliminar = function () {
        if ($scope.Lista !== null && $scope.Lista.length > 0){
          $scope.PuedeEliminar = true;
        }else{
          $scope.PuedeEliminar = false
        }
      }
      
      $scope.eliminarEncuesta = function (encuesta){
        $ionicLoading.show({
          template: 'Loading...'
        });        
        tracingService.eliminarEncuesta(encuesta.doc)
        $scope.Lista.splice($scope.Lista.indexOf(encuesta), 1);
        $scope.actualizarLista();
      }
      
      $scope.cargarEncuestas = function(){
        $ionicLoading.show({
          template: 'Loading...'
        });
        var encuestasPendientes = 0;        
        if(tracingService.isloggedIn()){
          tracingService.listEncuestas().then(function (result) {
            encuestasPendientes = result.rows.length;
            if (encuestasPendientes > 0){
              var salvado = tracingService.syncEncuestas();
              if (salvado){
                $scope.actualizarLista();
                $scope.salvadoExitoso();                
              } else {
                $ionicLoading.hide();
                $scope.errorEncuesta();                
              }
            }
          }); 
        }else{
          $ionicLoading.hide();
          tracingService.login(null,$scope.cargarEncuestas,$scope.errorConexion);
        }        
      }
      
      $scope.errorEncuesta = function () {
        $ionicPopup.alert({
          title: 'Error desconocido',
          template: 'Ha ocurrido un error desconocido en el servidor al intentar salvar una o más encuestas, para revisar las encuestas que no fueron salvadas verifique las encuestas almacenadas. Intente sincronizar nuevamente, si el error persiste contacte al administrador del sistema',
        })
      }
      
      $scope.salvadoExitoso = function () {
        $ionicPopup.alert({
          title: 'Salvado exitoso',
          template: 'Todas las encuestas han sido sincronizadas exitosamente',
        })
      }
      
      $scope.errorConexion = function () {
        $ionicPopup.alert({
          title: 'Conexión fallida',
          template: 'No se ha podido establecer conexión alguna con el servidor, verifique que el dispositivo está conectado a internet',
        })
      }
      
      $scope.confirmarEliminar = function (encuesta){
        $ionicPopup.confirm({
            title: 'Eliminar encuesta',
            template: '<p>Está seguro de eliminar la encuesta seleccionada?</p><p><em>Una vez eliminada la información no se puede recuperar</em></p>',
            cancelText: 'No',
            okText: 'Si',
          }).then(function(res) {
            if(res) {
              $scope.eliminarEncuesta(encuesta);
            }
          });
      }
            
    })
    
  .controller('EncuestaCtrl',
    function ($scope, $stateParams, tracingService,$state,$ionicPopup,$ionicHistory) {
      $scope.encuesta={};
      $scope.encuesta.Encabezado={};
      $scope.encuesta.Encabezado.Fecha=new Date();
      $scope.encuesta.Preguntas=[];
      $scope.encuesta.Instrumento={}
      $scope.formulario={};

      tracingService.getInstrumentos().then(function (response) {
        $scope.instrumentos = response.instrumentos;
        var instrumento=$scope.instrumentos[$stateParams.index].Formulario;
        $scope.formulario=JSON.parse( instrumento);
        $scope.encuesta.Preguntas=$scope.formulario.Preguntas;
        $scope.encuesta.Instrumento=$scope.formulario.Instrumento;
        Object.keys($scope.encuesta.Preguntas).forEach(function (element, index) {
          if ($scope.encuesta.Preguntas[index].seleccion_multiple == 'Si') {
            $scope.encuesta.Preguntas[index].Respuesta = [];
          }
        });       
      });

      $scope.Salvar=function(callback){
         tracingService.addEncuesta($scope.encuesta).then(function(){
           $scope.cargarEncuestas();
         });
         if (callback !== null) {
             var encabezado = $scope.encuesta.Encabezado;
             var preguntas = $scope.encuesta.Preguntas;
             var camposLimpios = callback(encabezado, preguntas);
             $scope.encuesta.Encabezado = camposLimpios[0];
             $scope.encuesta.Preguntas = camposLimpios[1];
          }else {
            $ionicHistory.goBack();
          }            
      }
      
      $scope.cargarEncuestas = function(){
        var encuestasPendientes = 0;        
        if(tracingService.isloggedIn()){
          tracingService.listEncuestas().then(function (result) {
            encuestasPendientes = result.rows.length;
            if (encuestasPendientes > 0){
              tracingService.syncEncuestas();
            }
          }); 
        }else{
          tracingService.login(null,$scope.cargarEncuestas,function(){return true;});
        }
      }
      
      $scope.salvarYnueva = function () {
        $scope.Salvar(function (encabezado, preguntas) {
            var result = $scope.limpiarCampos(encabezado, preguntas);
            return result;
        });
      }
      
      $scope.limpiarCampos = function(encabezado, preguntas){
        var campos = [null, null];
            var tempFecha = encabezado.Fecha;
            var tempCentroEscolar = encabezado.CentroEscolar;

            for (var i = 0; i < preguntas.length; i++) {
                preguntas[i].Respuesta = null
            }

            encabezado = new Object;
            encabezado.Fecha = tempFecha;
            encabezado.CentroEscolar = tempCentroEscolar;

            campos[0] = encabezado;
            campos[1] = preguntas;

            return campos;
      }
      
      $scope.RespuestasEnBlanco = '';
      $scope.rectificarSalvado = function (desde) {
          $scope.RespuestasEnBlanco = '';
          $scope.tipoSalvado = desde;
          console.log($scope);
          var empty;
          var j;
          for (var i = 0; i < $scope.encuesta.Preguntas.length; i++) {            
              if ($scope.encuesta.Preguntas[i].seleccion_multiple == 'Si') {
                j = 0;
                empty = true;
                while (j < $scope.encuesta.Preguntas[i].Respuesta.length && empty) {
                    if ($scope.encuesta.Preguntas[i].Respuesta[j] !== null) {
                        empty = false;
                    }
                }

                if (empty) {
                    $scope.RespuestasEnBlanco.push(i + 1);
                }

              } else {
                if ($scope.encuesta.Preguntas[i].Respuesta == null) {
                    $scope.RespuestasEnBlanco.push(i + 1);
                }
              } 
          }
          if ($scope.RespuestasEnBlanco !== ''){
            $scope.confirmarSalvado(desde);
          } else {
            if (desde === 0) {
              $scope.Salvar(null);
            } else if (desde === 1) {
              $scope.salvarYnueva();
            }
          }
          
      }
      
      $scope.confirmarSalvado = function (desde){
        var confirmPopup = $ionicPopup.confirm({
            title: 'Respuestas en blanco',
            subTitle: 'La encuesta que acaba de llenar tiene las siguientes preguntas sin responder:',
            template: '<p>'+$scope.RespuestasEnBlanco+'</p><p>Desea continuar salvando la encuesta?</p>',
            cancelText: 'No',
            okText: 'Si',
          });
          confirmPopup.then(function(res) {
            if(res) {
              if (desde === 0) {
                $scope.Salvar(null);
              } else if (desde === 1) {
                $scope.salvarYnueva();
              }
            }
          });
      };
      
      $scope.split = function (cadena) 
      {
        cadena=cadena.replace(/\n/g, "|")
        return cadena.split("|");
      }
    })
 ;