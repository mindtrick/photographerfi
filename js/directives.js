/**
 * Created by 758orenh on 1/15/2015.
 */
var apiUrl = 'http://photofim-mindtrick.rhcloud.com/';
//apiUrl = 'http://localhost:8080/';
angular.module('starter.directives', ['starter.config'])

.directive('galleryFinish',function(){

    return function(scope)
    {
        if(scope.$first)
        {
            var wall = new freewall("#gallery-container");

            wall.reset({
                selector: '.gallery-image',
                animate: true,
                onResize: function() {
                    wall.fitWidth();
                    wall.fitHeight();
                }
            });

            wall.container.find('.item-img img').load(function() {
                wall.fitWidth();
                wall.fitHeight();
            });
        }
    };
})

    .factory('PhotographerService', function($http) {
        var GetPhotographer = function(id,password, fn) {
            this.initialize = function(id,password,fn) {
                var url = apiUrl + 'photographer/'+id+"/"+password;
                var photographerData = $http.get(url);

                photographerData.then(function(response) {
                        fn(response.data);
                });
            };

            this.initialize(id,password,fn);
        };

        // Return a reference to the function
        return {
            photographer:(GetPhotographer)
        };
    })

    .factory('EventsService', function($http) {


        var GetEvents = function(errorCallback) {

            this.fromLocalStorage = function() {
                var events = JSON.parse(localStorage.getItem('events'));
                if(!events)
                {
                    events = {};
                }
                return events;
            };

            this.initialize = function() {
                var url = apiUrl + 'photographer/'+localStorage.getItem('photographer');
                var self = this;
                $http.get(url).error(function(error){
                    angular.extend(self, self.fromLocalStorage());
                }).success(function(response) {
                    try {
                        var events = response.data["Events"];
                        if (events.length > 0) {
                            var url = apiUrl + 'events/' + events.join(',');
                            $http.get(url).then(function (response) {
                                localStorage.setItem('events', JSON.stringify(response.data["data"]));
                                angular.extend(self, response.data["data"]);
                            });
                        }
                    }
                    catch(err)
                    {
                        angular.extend(self, self.fromLocalStorage());
                    }

                },function(data){
                    console.log(data);
                    errorCallback();
                });
            };

            this.initialize();
        };

        var GetEventById = function (id)
        {
            this.initialize = function() {
                var url = apiUrl + 'event/' + id;
                var eventsData = $http.get(url);
                var self = this;

                eventsData.then(function(response) {
                    angular.extend(self, response.data["data"]);
                });
            };

            this.initialize();
        };

        var AddEvent = function(event)
        {
            var url = apiUrl + 'events';
            var photographerId = localStorage.getItem('photographer');
            var result = $http.post(url, JSON.stringify({event: event, photographerId: photographerId}));
            return result;
        };

        var AddImages = function(image,fn)
        {
            var url = apiUrl+'event/' + image['eventId'] + "/image";
            $http.post(url, JSON.stringify(image)).then(function(data){
                fn(data["data"]["type"], image);
            },
            function(data){
                fn(false, image);
            });
        };
        // Return a reference to the function
        return {
            events:(GetEvents),
            getEvent: (GetEventById),
            addEvent: (AddEvent),
            addImages: (AddImages)
        };

    })

    .factory('DB', function($q, DB_CONFIG) {
        var self = this;
        self.db = null;

        self.init = function() {
            document.addEventListener("deviceready", onDeviceReady, false);
            function onDeviceReady() {
                self.db = window.sqlitePlugin.openDatabase({name: DB_CONFIG.name});// in production
              // self.db = window.openDatabase(DB_CONFIG.name, '1.0', 'database', -1);

                angular.forEach(DB_CONFIG.tables, function(table) {
                    var columns = [];

                    angular.forEach(table.columns, function(column) {
                        columns.push(column.name + ' ' + column.type);
                    });

                    var query = 'CREATE TABLE IF NOT EXISTS ' + table.name + ' (' + columns.join(',') + ')';
                    self.query(query);
                    console.log('Table ' + table.name + ' initialized');
                });
            }

        };

        self.query = function(query, bindings) {
            bindings = typeof bindings !== 'undefined' ? bindings : [];
            var deferred = $q.defer();

//
//                self.db.execQueryArrayResult(query, bindings, function(transaction, result) {
//                    deferred.resolve(result);
//                }, function(transaction, error) {
//                    deferred.reject(error);
//                });

            self.db.transaction(function(transaction) {
                transaction.executeSql(query, bindings, function(transaction, result) {
                    deferred.resolve(result);
                }, function(transaction, error) {
                    deferred.reject(error);
                });
            });

            return deferred.promise;
        };

        self.fetchAll = function(result) {
            var output = [];

            for (var i = 0; i < result.rows.length; i++) {
                output.push(result.rows.item(i));
            }

            return output;
        };

        self.fetch = function(result) {
            return result.rows.item(0);
        };

        return self;
    })
// Resource service example
    .factory('ImagesToUpload', function(DB) {
        var self = this;

        self.all = function() {
            return DB.query('SELECT * FROM imagesToUpload')
                .then(function(result){
                    console.log(result);
                    return DB.fetchAll(result);
                });
        };

        self.getById = function(id) {
            return DB.query("SELECT * FROM imagesToUpload WHERE fullImageUrl = ?", [id])
                .then(function(result){
                    return DB.fetch(result);
                });
        };

        self.insertNewImage = function(fullImageUrl, eventId, thumbnailUrl, thumbnailData, imageData)
        {
            DB.query("insert into imagesToUpload values (?,?,?,?,?)", [fullImageUrl, eventId,thumbnailUrl,thumbnailData,imageData])
                .then(function(result){
                    console.log(result);
                });
        };

        self.deleteAll = function(){
            DB.query("delete from imagesToUpload");
        };

        self.deleteImage = function(fullImageUrl)
        {
            DB.query("delete from imagesToUpload where fullImageUrl= ?",[fullImageUrl])
                .then(function(result){
                    console.log(result);
                });
        };

        self.selectIds = function()
        {
            return DB.query('SELECT fullImageUrl FROM imagesToUpload')
                .then(function(result){
                    var array =  DB.fetchAll(result);
                    var compressed = [];
                    for(var i=0; i<array.length; i++)
                    {
                        compressed.push(array[i]["fullImageUrl"]);
                    }
                    return compressed;
                });
        };

        return self;
    })

    .factory('UploadedImages', function(DB) {
        var self = this;

        self.all = function() {
            return DB.query('SELECT * FROM uploadedImages')
                .then(function(result){
                    return DB.fetchAll(result);
                });
        };

        self.getById = function(id) {
            return DB.query("SELECT * FROM uploadedImages WHERE fullImageUrl = ?", [id])
                .then(function(result){
                    return DB.fetch(result);
                });
        };

        self.insertNewImage = function(fullImageUrl, eventId, thumbnailUrl)
        {
            DB.query("insert into uploadedImages values (?,?,?)", [fullImageUrl, eventId,thumbnailUrl])
                .then(function(result){
                    console.log(result);
                });
        };
        self.deleteAll = function(){
            DB.query("delete from uploadedImages");
        };
        self.deleteImage = function(fullImageUrl)
        {
            DB.query("delete from uploadedImages where fullImageUrl= ?",[fullImageUrl])
                .then(function(result){
                    console.log(result);
                });
        };

        self.selectIds = function()
        {
            return DB.query('SELECT fullImageUrl FROM uploadedImages')
                .then(function(result){
                    var array =  DB.fetchAll(result);
                    var compressed = [];
                    for(var i=0; i<array.length; i++)
                    {
                        compressed.push(array[i]["fullImageUrl"]);
                    }
                    return compressed;
                });
        };

        return self;
    });
