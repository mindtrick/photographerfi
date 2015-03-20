angular.module('starter.controllers', [])

    .controller('AppCtrl', function($scope, $ionicModal, $location, PhotographerService) {
        closeAddModal = function() {
            if($scope.modal)
                $scope.modal.hide();
            $location.path( "#/events" );

        };

        if(localStorage.getItem('photographer'))
        {
            closeAddModal();
            return;
        }
        // Form data for the login modal
        $scope.loginData = {};

        // Create the login modal that we will use later
        $ionicModal.fromTemplateUrl('templates/login.html', {
            scope: $scope
        }).then(function(modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });

        // Perform the login action when the user submits the login form
        $scope.doLogin = function() {
            $scope.msgError = "Loading...";
            PhotographerService.photographer($scope.loginData.uniqueId,$scope.loginData.password, function(data){
                if(data == true)
                {
                    localStorage.setItem("photographer",$scope.loginData.uniqueId);
                    closeAddModal();
                }
                else
                {
                    $scope.msgError = "wrong password or unique Id";
                }
            });

        };

    })

    .controller('EventsCtrl', function($scope,$ionicModal, $timeout,$ionicPopup,EventsService, ImagesToUpload, UploadedImages) {

        $scope.events = new EventsService.events(function(){
            $ionicPopup.alert({
                title: 'Failed to get events',
                template: 'check your internet connection'
            });
        });
        $scope.eventData = {};
        //creating add modal
        $ionicModal.fromTemplateUrl('templates/addEvent.html', {
            scope: $scope
        }).then(function(modal) {
            $scope.modal = modal;
        });

        // Triggered in the login modal to close it
        $scope.closeAddModal = function() {
            $scope.modal.hide();
            $scope.eventData = {};
        };

        $scope.add = function()
        {
            $scope.modal.show();
        };


        $scope.addEvent = function()
        {
            console.log('add event', $scope.eventData);

            //TODO: send data to db and get the real event from the server
            //$scope.eventData.id = $scope.events.length + 1;

            $scope.eventData.avatar = "http://placehold.it/100";
            //$scope.events.push($scope.eventData);
            EventsService.addEvent($scope.eventData).then(function()
            {
                $scope.events = new EventsService.events();
                //TODO: add validation

                $timeout(function() {
                    $scope.closeAddModal();
                }, 500);
            });

        };

        $scope.clearMemory = function(){
            ImagesToUpload.deleteAll();
            UploadedImages.deleteAll();
        };

        $scope.refresh = function() {

            var isPopedUp = false;

            var ImageCounter = function (totaImages)
            {
                this.current = 0;
                this.total = totaImages;
                this.newImage = function(){
                    this.current++;
                    if(this.current == this.total)
                    {
                        this.cancel();
                    }
                };
                this.cancel = function(){
                    $scope.ImageCounter=null
                };
            };

            ImagesToUpload.all().then(function(images){
                $scope.ImageCounter = new ImageCounter(images.length);
                for(var urlId in images) {
                    var image = images[urlId];

                    EventsService.addImages(image,function(success, image){
                        if(success)
                        {
                            if(success != "cannot save image") {
                                console.log("save image in server successfully");
                                ImagesToUpload.deleteImage(image.fullImageUrl);
                                UploadedImages.insertNewImage(image.fullImageUrl,image.eventId,image.thumbnailUrl);
                                if ($scope.ImageCounter)
                                    $scope.ImageCounter.newImage()
                            }
                        }
                        else{
                            if(isPopedUp == false) {
                                isPopedUp = true;
                                $scope.ImageCounter = null;
                                $ionicPopup.alert({
                                    title: 'Failed to upload images',
                                    template: 'connect to your mobile network'
                                });
                            }
                        }
                    });
                }
            });
        };
    })

    .controller('EventCtrl', function($scope,$timeout,$location, ImagesToUpload, UploadedImages) {

        $scope.eventId = $location.path().substring($location.path().lastIndexOf('/')+1);
        $scope.Images = [];
        $scope.ImageCounter = null;
            //TODO: remove to factory

            var imageSource = "http://flashair/command.cgi?op=100&DIR=/DCIM";

            UploadedImages.selectIds().then (function(uploadedImagesIds){
                return ImagesToUpload.selectIds().then(function(imagesIds){

                        //var paths = mock(20);
                        var paths = [];
                         getFiles(imageSource, imagesIds, uploadedImagesIds,true);
                        //$scope.Images = paths;

                });
            });


            function mock(times){

                for(var i=1;i<times;i++) {
                    var image = {
                        fullImageUrl: 'http://placehold.it/'+(i*200),
                        thumbnail: 'http://placehold.it/98',
                        title: ''
                    };
                    $scope.Images.push(image);
                }
            }
            // recursive function which go through all the files and return them
            function getFiles(getDirURL, imagesIds, uploadedImagesIds,first)
            {
                var thumbline = "http://flashair/thumbnail.cgi?/DCIM/";
                var path = "http://flashair/DCIM/";

                var self = this;
                $.ajax({url:getDirURL,async:first})

                    .success(function( data ) {
                        var files = data.split('\n');
                        files = files.slice(1,files.length-1);
                        $.each(files,function(index,fileMetadata){
                            var metadataPieces = fileMetadata.split(','),
                                isDir = metadataPieces[2] =='0',
                                newURL = getDirURL + '/' + metadataPieces[1];
                            if(isDir)
                            {
                                getFiles(newURL, imagesIds, uploadedImagesIds, true);
                            }
                            else
                            {

                                //TODO: add more data please
                                var relativePath = newURL.split('/DCIM/')[1];
                                if(relativePath.indexOf('.MOV')== -1 && relativePath.indexOf('.AVI')== -1&&  imagesIds.indexOf(path +  relativePath)==-1) {

                                    if(uploadedImagesIds.indexOf(path + relativePath)==-1) {
                                        var image = {
                                            fullImageUrl: path + relativePath,
                                            thumbnail: thumbline + relativePath,
                                            title: ''
                                        };
                                        $scope.Images.push(image);
                                    }
                                }
                            }
                        });

                    })
                    .error(function(data){
                        $('#gallery-msg').text('You are not connected to photofi WiFi');
                    });
            }


        $scope.upload = function()
        {
            var selectedDefinitions = $scope.Images;

            var Base64 = function(URL,imageObj,maxSize,callback) {


                this.initialize = function(URL,imageObj,callback) {
                    var img = new Image();
                    img.setAttribute('crossOrigin', 'anonymous');

                    var self = this;

                    img.onload = function () {
                        var canvas = document.createElement('canvas'),
                            width = img.width,
                            height = img.height;
                        if (width > height) {
                            if (width > maxSize) {
                                height *= maxSize / width;
                                width = maxSize;
                            }
                        } else {
                            if (height > maxSize) {
                                width *= maxSize / height;
                                height = maxSize;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                        var dataURL = canvas.toDataURL("image/jpg",0.8);
                        callback(imageObj,dataURL.replace(/^data:image\/(png|jpg);base64,/, ""));
                    };
                    img.src = URL;

                };

                this.initialize(URL,imageObj,callback);
            };


            var ImageCounter = function (totaImages)
            {
                this.current = 0;
                this.total = totaImages;
                this.newImage = function(){
                    this.current++;
                    $('progress').attr('value',this.current);
                    if(this.current == this.total)
                    {
                        this.cancel();
                    }
                };
                this.cancel = function(){
                    $scope.ImageCounter=null;
                    $('progress').remove();
                    window.location.hash="#/app/events";
                };
            };
            $scope.ImageCounter = new ImageCounter(selectedDefinitions.length);


            for(var i in selectedDefinitions)
            {
                try
                {
                    var image = selectedDefinitions[i];

                    var imageObj = {
                        event: $scope.eventId,
                        thumbnail: image.thumbnail,
                        fullImageUrl: image.fullImageUrl
                    };
                    var image = new Base64(imageObj.fullImageUrl, imageObj,500,function(fullImage,data)
                    {
                        ImagesToUpload.insertNewImage(fullImage["fullImageUrl"],
                            fullImage["event"],fullImage["thumbnail"], "",data);
                        if ($scope.ImageCounter)
                            $scope.ImageCounter.newImage();
                    });
                }
                catch (err)
                {
                    if ($scope.ImageCounter)
                        $scope.ImageCounter.newImage();
                }

            }
        }

    });
