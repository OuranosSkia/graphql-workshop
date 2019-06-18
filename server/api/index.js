'use strict';
var rp = require('request-promise-native');

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const register = function (server, options) {

    server.route({
        method: 'GET',
        path: '/',
        options: {
            handler: (request, h) => {

                return {
                    message: 'Welcome to the plot device.'
                };
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/lake',
        options: {
            handler: async (request, h) => {
                return rp('http://localhost:8080/api/backend/lake')
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/rocks',
        options: {
            handler: (request, h) => {
                return rp('http://localhost:8080/api/backend/rocks')
            }
        }
    });

    // **** BELOW IS "Backend" ROUTES ****
    server.route({
        method: 'GET',
        path: '/backend/lake',
        options: {
            handler: (request, h) => {
                const lake = require("../data/lake");
                return {
                    items: shuffle(lake.items)
                }
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/backend/rocks',
        options: {
            handler: (request, h) => {
                const rocks = require("../data/rocks");
                return {
                    items: shuffle(rocks.items)
                }
            }
        }
    });
};

exports.plugin = {
    register,
    name: 'api'
};
