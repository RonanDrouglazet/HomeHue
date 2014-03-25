make: before cleanSubmodule git submodule cleanSubmodule2 homehue

before:
	git submodule init
	git submodule update --init --recursive
	npm install

git:
	cd bootstrap && git pull --rebase origin master
	cd bootstrap_slider && git pull --rebase origin master

submodule:
	cd bootstrap && npm install
	cd bootstrap && grunt dist
	cd bootstrap_slider && npm install
	cd bootstrap_slider && grunt test
	cp bootstrap_slider/dist/bootstrap-slider.min.js dist/bootstrap/bootstrap-slider.min.js
	cp bootstrap_slider/dist/css/bootstrap-slider.min.css dist/bootstrap/bootstrap-slider.min.css
	cp bootstrap/dist/js/bootstrap.min.js dist/bootstrap/bootstrap.min.js
	cp bootstrap/dist/css/bootstrap.min.css dist/bootstrap/bootstrap.min.css
	cp -R bootstrap/dist/fonts/* dist/fonts/

cleanSubmodule:
	cd bootstrap && git checkout .
	cd bootstrap_slider && git checkout .

cleanSubmodule2:
	cd bootstrap && git checkout .
	cd bootstrap_slider && git checkout .

homehue:
	grunt
	#    _    _                      _    _
	#   | |  | |                    | |  | |
	#   | |__| | ___  _ __ ___   ___| |__| |_   _  ___
	#   |  __  |/ _ \| '_ ` _ \ / _ \  __  | | | |/ _ \ JS
	#   | |  | | (_) | | | | | |  __/ |  | | |_| |  __/
	#   |_|  |_|\___/|_| |_| |_|\___|_|  |_|\__,_|\___|
	#
	#   running on http://localhost:8080
	node dist/node.min.js

