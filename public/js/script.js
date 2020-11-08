var app = angular.module('myApp', ['ngRoute', 'ngDialog']);
const socket = io.connect();
//Забираєм %2F та з url сайту
app.config(['$locationProvider', function ($locationProvider) {
    $locationProvider.hashPrefix('');
    $locationProvider.html5Mode(true);
}]);
//Створюємо адреси
app.config(function ($routeProvider) {
    $routeProvider.otherwise({
        redirectTo: '/'
    });
});

app.controller('myCtrl', function ($scope) {});
app.directive('menuBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/menu.html'
        , controller: function ($scope) {
            $scope.homeStatus = true;
            //Home
            $scope.chooseHome = function () {
                $scope.contactStatus = false;
                $scope.productStatus = false;
                $scope.homeStatus = true;
            };
            //Products
            $scope.chooseProducts = function () {
                $scope.contactStatus = false;
                $scope.productStatus = true;
                $scope.homeStatus = false;
            };
            //Contacts
            $scope.chooseContacts = function () {
                $scope.contactStatus = true;
                $scope.productStatus = false;
                $scope.homeStatus = false;
            };
        }
    }
});
app.directive('searchBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/search.html'
        , controller: function ($scope) {}
    }
});
app.directive('loginBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/login.html'
        , controller: function ($scope, $http, ngDialog) {
            if (localStorage.userName != 'default') {
                if (localStorage.userName != undefined) {
                    $scope.newUser = false;
                    $scope.enterLogin = true;
                    $scope.userIn = 'Welcome, ' + localStorage.userName + '!';
                }
                else {
                    localStorage.userName = 'default';
                    $scope.newUser = true;
                    $scope.enterLogin = false;
                }
            }
            else {
                $scope.newUser = true;
                $scope.enterLogin = false;
            }
            // Autorisation
            $scope.signIn = function () {
                var obj = {
                    login: $scope.login
                    , password: $scope.password
                };
                socket.emit("signIn", obj);
                socket.on('getSignIn', function (data) {
                    if ((data == 'Wrong Password') || (data == 'Wrong Login')) {
                        //                    alert(data);
                        ngDialog.open({
                            template: '/template/welcome.html'
                            , className: 'ngdialog-theme-default'
                            , controller: function ($scope) {
                                $scope.statusBack = data;
                            }
                        });
                    }
                    else {
                        $scope.newUser = false;
                        $scope.enterLogin = true;
                        $scope.userIn = data;
                        localStorage.userName = $scope.login;
                    }
                });
            };
            //Реєстрація
            $scope.registration = function () {
                ngDialog.open({
                    template: '/template/registration.html'
                    , className: 'ngdialog-theme-default'
                });
            }
            
            //Розлогуватись
            $scope.logOut = function () {
                localStorage.userName = 'default';
                $scope.newUser = true;
                $scope.enterLogin = false;
                $scope.login = "";
                $scope.password = "";
            }
            
            // Forget password
            $scope.forget = function () {
                ngDialog.open({
                    template: '/template/forget.html'
                    , className: 'ngdialog-theme-default'
                })
            };
            
        }
    }
});
//Директива Нагадування паролю
app.directive('forgetBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/forget-block.html'
        , controller: function ($scope, $http, ngDialog) {
            //Кидаєм на сервер пошту для відправки забутого паролю
            $scope.remind = function () {
                let obj = {
                    mail: $scope.remindMail
                };
                socket.emit('forgetPassword', obj);
                ngDialog.closeAll();
            }
            socket.on('message', function (data) {
                alert(data);
            })
        }
    }
});
//Директива Реєстрації-модальне вікно
app.directive('regBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/reg-block.html'
        , controller: function ($scope, $http, ngDialog) {
            //Код верифікації при реєстрації кидаєм на телефон
            $scope.code = "";
            $scope.verification = function () {
                $scope.code = Math.floor(Math.random() * (9000 - 3000 + 1)) + 3000;
                let obj = {
                    code: $scope.code
                    , number: $scope.newPhone
                };
                //                $http.post('http://localhost:8000/testtwilio/', obj)
                //                    .then(function successCallback(response) {}, function errorCallback(response) {
                //                        console.log("Error!!!" + response.err);
                //                    });
                socket.emit('twilio', obj);
            };
            //Реєстрація
            $scope.registr = function () {
                if ($scope.newVerCode == $scope.code) {
                    let obj2 = {
                        login: $scope.newLogin
                        , password: $scope.newPassword
                        , mail: $scope.newMail
                    , };
                    socket.emit('signUp', obj2);
                    socket.on('message', function (data) {
                        alert(data);
                    })
                    ngDialog.closeAll();
                }
                else {
                    alert("Wrong Verification Code!");
                }
            };
        }
    }
});
app.directive('productBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/products.html'
        , controller: function ($scope, $http) {
            $http.get('http://localhost:8080/items').then(function successCallback(response) {
                $scope.items = response.data;
            }, function errorCallback(response) {
                console.log('Error!' + response.err);
            });
            //            socket.on('message', function (data) {
            //                $scope.items = data;
            //            })
            //Додати товар
            $scope.addItemStatus = false;
            $scope.allProducts = true;
            $scope.addItem = function () {
                $scope.addItemStatus = true;
                $scope.allProducts = false;
            };
            //Кнопка "Перехід до товару"
            $scope.chooseItem = function (index, name, price, indexArr, itemSrc) {
                let beforeCountChanges = itemSrc.split("-");
                $scope.editItemStatus = false;
                $scope.indexOfItem = index;
                //Отримати опис товарів при загрузці сторінки товару
                $http.get('http://localhost:8080/items-info').then(function successCallback(response) {
                    $scope.itemsInfoText = response.data;
                    $scope.allItems = false;
                    $scope.statusItem = true;
                    $scope.choosenItemName = name;
                    $scope.choosenItemPrice = price;
                    $scope.choosenItemSrc = itemSrc;
                    $scope.choosenItemText = $scope.itemsInfoText[indexArr];
                }, function errorCallback(response) {
                    console.log("Error!!!" + response.err);
                });
                $scope.changeSatusImgUpload = function () {
                    $scope.statusImgUpload = true;
                }
                $scope.editItem = function () {
                    $scope.editItemStatus = true;
                    $scope.newNameOfItem = $scope.choosenItemName;
                    $scope.newPriceOfItem = $scope.choosenItemPrice;
                    $scope.newInfoOfItem = $scope.choosenItemText;
                    $scope.newItemSrc = $scope.choosenItemSrc;
                };
                $scope.deleteItem = function () {
                        $http.delete('http://localhost:8080/item/' + index).then(function successCallback() {
                            console.log("Deleted!");
                            $scope.itemsInfoText.splice(indexArr, 1);
                            //Завантаження опису в текстовий файл
                            let obj = {
                                text: $scope.itemsInfoText.join('/item/')
                            };
                            $http.put('http://localhost:8080/items-info', obj).then(function successCallback() {
                                console.log("Updated text in txt file");
                                //Отримати список товарів при загрузці сайту
                                $http.get('http://localhost:8000/items').then(function successCallback(response) {
                                    $scope.myWelcome2 = response.data;
                                    $scope.allItems = true;
                                    $scope.statusItem = false;
                                    $scope.choosenItemName = "";
                                    $scope.choosenItemPrice = "";
                                }, function errorCallback(response) {
                                    console.log("Error!!!" + response.err);
                                });
                            }, function errorCallback(response) {
                                console.log("Error!!!" + response.err);
                            });
                        }, function errorCallback(response) {
                            console.log("Error!!!" + response.err);
                        })
                    }
                    // редагування, приймаємо зміни
                var newAdrrImg = "";
                $scope.changeItemEdit = function () {
                    //Завантаження зображення
                    if ($scope.statusImgUpload) {
                        var fd = new FormData();
                        if (beforeCountChanges[1] == undefined) {
                            newAdrrImg = itemSrc + "-" + $scope.countChanges
                        }
                        else {
                            $scope.countChanges += Number(beforeCountChanges[1]);
                            newAdrrImg = beforeCountChanges[0] + "-" + $scope.countChanges;
                        }
                        fd.append(newAdrrImg, $scope.myFile);
                        $http.post('http://localhost:8080/images', fd, {
                            transformRequest: angular.identity
                            , headers: {
                                'Content-Type': undefined
                            }
                        }).then(function successCallback() {
                            console.log("Uploaded!");
                        }, function errorCallback(response) {
                            console.log("Error!!!" + response.err);
                        })
                    }
                    $scope.itemsInfoText[indexArr] = $scope.newInfoOfItem;
                    //Завантаження опису в текстовий файл
                    let obj = {
                        text: $scope.itemsInfoText.join('/item/')
                    };
                    $http.put('http://localhost:8080/items-info', obj).then(function successCallback() {
                        console.log("Updated text in txt file");
                    }, function errorCallback(response) {
                        console.log("Error!!!" + response.err);
                    });
                    $scope.countChanges += Number(beforeCountChanges[1]);
                    if ($scope.statusImgUpload) {
                        var objEdit = {
                            name: $scope.newNameOfItem
                            , price: $scope.newPriceOfItem
                            , src: newAdrrImg
                        }
                    }
                    else {
                        var objEdit = {
                            name: $scope.newNameOfItem
                            , price: $scope.newPriceOfItem
                            , src: itemSrc
                        }
                    }
                    $http.post('http://localhost:8080/item-edit/' + $scope.indexOfItem, objEdit).then(function successCallback() {
                        console.log("Edited");
                    }, function errorCallback(response) {
                        console.log("Error!!!" + response.err);
                    });
                    $http.get('http://localhost:8080/items').then(function successCallback(response) {
                        $scope.myWelcome2 = response.data;
                        $scope.choosenItemName = $scope.newNameOfItem;
                        $scope.choosenItemPrice = $scope.newPriceOfItem;
                        $scope.choosenItemText = $scope.newInfoOfItem;
                        if ($scope.statusImgUpload) {
                            $scope.choosenItemSrc = newAdrrImg;
                        }
                        else {
                            $scope.choosenItemSrc = itemSrc;
                        };
                        $scope.statusImgUpload = false;
                        $scope.editItemStatus = false;
                    }, function errorCallback(response) {
                        console.log("Error!!!" + response.err);
                    });
                }
            };
            //Кнопка "Перехід до всіх товарів"
            $scope.backToAllItems = function () {
                $scope.allItems = true;
                $scope.statusItem = false;
                $scope.choosenItemName = "";
                $scope.choosenItemPrice = "";
            };
        }
    }
});
//Директива з унікальним атрибутом - для передачі файлів
app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A'
        , link: function (scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
            element.bind('change', function () {
                scope.$apply(function () {
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);
//Директива AddItem
app.directive('addItemBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/addItem.html'
        , controller: function ($scope, $http) {
            $scope.nameOfNewItem = "";
            $scope.priceOfNewItem = "";
            $scope.aboutNewItem = "";
            //Додати товар
            $scope.addNewItem = function () {
                //генерація нової назви зображення після завантаження
                var imgNumberName = 0;
                if ($scope.items[0] == undefined) {
                    imgNumberName = 1;
                }
                else {
                    imgNumberName = $scope.items[$scope.items.length - 1].id + 1;
                };
                //Завантаження зображення
                var fd = new FormData();
                fd.append(imgNumberName, $scope.myFile);
                $http.post('http://localhost:8080/images', fd, {
                    transformRequest: angular.identity
                    , headers: {
                        'Content-Type': undefined
                    }
                }).then(function successCallback() {
                    console.log("Uploaded!");
                }, function errorCallback(response) {
                    console.log("Error!!!" + response.err);
                });
                //Завантаження опису в текстовий файл
                let obj = {
                    text: $scope.aboutNewItem
                };
                $http.post('http://localhost:8080/items-info', obj).then(function successCallback() {
                    console.log("Text in txt file");
                }, function errorCallback(response) {
                    console.log("Error!!!" + response.err);
                });
                //Запис товару в базу даних
                let obj2 = {
                    name: $scope.nameOfNewItem
                    , price: $scope.priceOfNewItem
                    , src: imgNumberName
                };
                $http.post('http://localhost:8080/items', obj2).then(function successCallback() {
                    console.log("Data in DB");
                }, function errorCallback(response) {
                    console.log("Error!!!" + response.err);
                });
                //Запис оновлення опису товару в ткст файл
                //Оновлення списку товарів
                $http.get('http://localhost:8080/items').then(function successCallback(response) {
                    $scope.items = response.data;
                    $scope.addItemStatus = false;
                    $scope.allItems = true;
                    $scope.nameOfNewItem = "";
                    $scope.priceOfNewItem = "";
                    $scope.aboutNewItem = "";
                }, function errorCallback(response) {
                    console.log("Error!!!" + response.err);
                });
            }
        }
    }
});
app.directive('contactBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/contacts.html'
        , controller: function ($scope) {}
    }
})
app.directive('chatBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/chat.html'
        , controller: function ($scope) {
            $('.parg').click(function () {
                $('.chatHidden').animate({
                    width: '18vw'
                    , height: '55vh'
                    , marginTop: '10vh'
                    , backgroundColor: 'black'
                }, 1000);
                setTimeout(function () {
                    $('.close').css({
                        display: 'block'
                    });
                    $('.chatBlock').css({
                        display: 'block'
                    });
                }, 900);
            });
            $('.close').click(function () {
                $('.chatHidden').animate({
                    width: '30px'
                    , height: '55vh'
                    , marginTop: '10vh'
                    , backgroundColor: 'black'
                });
                $('.close').css({
                    display: 'none'
                });
                $('.chatBlock').css({
                    display: 'none'
                })
            });
            //            $scope.arr = [];
            //            $scope.name = 'Julia';
            //            $scope.start = function () {
            //                if ($scope.enterText == undefined) {
            //                    $scope.arr.push($scope.name + ':' + ' ')
            //                }
            //                else {
            //                    $scope.arr.push($scope.name + ':' + ' ' + $scope.enterText);
            //                }
            //            }
            $scope.chatMessages = [];
            $scope.start = function () {
                socket.emit('send message', {
                    userName: $scope.login
                    , text: $scope.enterText
                })
                $scope.enterText = "";
            }
            socket.on('chat message', function (message) {
                $scope.chatMessages.push(message.text);
                $scope.$digest();
            })
        }
    }
});
app.directive('sliderBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/slider.html'
        , controller: function ($scope) {
            $(document).ready(function () {
                $('.prev').on('click', function () {
                    var prevImg = $('img.active').prev('.slider-inner img');
                    if (prevImg.length == 0) {
                        prevImg = $('.slider-inner img:last');
                    }
                    $('img.active').removeClass('active');
                    prevImg.addClass('active');
                });
                $('.next').on('click', function () {
                    var nextImg = $('img.active').next('.slider-inner img');
                    if (nextImg.length == 0) {
                        nextImg = $('.slider-inner img:first');
                    }
                    $('img.active').removeClass('active');
                    nextImg.addClass('active');
                });
                setInterval(function () {
                    var nextImg = $('img.active').next('.slider-inner img');
                    if (nextImg.length == 0) {
                        nextImg = $('.slider-inner img:first');
                    }
                    $('img.active').removeClass('active');
                    nextImg.addClass('active');
                }, 3000);
                $('.slider-inner').on('mouseover', function () {
                    clearInterval();
                })
            });
        }
    }
});
app.directive('footerBlock', function () {
    return {
        replace: true
        , templateUrl: 'template/footer.html'
        , controller: function ($scope) {}
    }
})