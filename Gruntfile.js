module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            app: {
                options: {
                    report: "gzip"
                },
                files: {
                    "dist/app.min.js": ["src/app.js"]
                }
            },
            node: {
                options: {
                    report: "gzip"
                },
                files: {
                    "dist/node.min.js": ["src/node.js"]
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
                src: ["Gruntfile.js", "src/app.js", "src/node.js"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.registerTask("default", ["uglify", "jshint"]);
};
