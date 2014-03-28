module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            front: {
                options: {
                    report: "gzip"
                },
                files: {
                    "dist/app_front.min.js": ["src/app_front.js"]
                }
            },
            back: {
                options: {
                    report: "gzip"
                },
                files: {
                    "dist/app_back.min.js": ["src/app_back.js"]
                }
            }
        },
        jshint: {
            app: {
                options: {
                  "curly": true,
                  "eqnull": true,
                  "eqeqeq": true,
                  "undef": true,
                  "node": true,
                  "globals": {
                    "window": true,
                    "document": true,
                    "$": true,
                    "XMLHttpRequest": true
                  }
                },
                src: ["Gruntfile.js", "src/app_back.js", "src/app_front.js"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.registerTask("default", ["uglify", "jshint"]);
};
