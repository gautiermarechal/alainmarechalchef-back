"use strict";

const { createCoreRouter } = require("@strapi/strapi").factories;
const defaultRouter = createCoreRouter("api::booking.booking");

const customRouter = (innerRouter, extraRoutes = []) => {
  let routes;
  return {
    get prefix() {
      return innerRouter.prefix;
    },
    get routes() {
      if (!routes) routes = innerRouter.routes.concat(extraRoutes);
      return routes;
    },
  };
};

const myExtraRoutes = [
  {
    method: "POST",
    path: "/bookings/create-stripe-payment-booking",
    handler: "api::booking.booking.createStripeBookingPayment",
  },
  {
    method: "POST",
    path: "/bookings/confirm-stripe-payment-booking",
    handler: "api::booking.booking.confirmStripeBookingPayment",
  },
];

module.exports = customRouter(defaultRouter, myExtraRoutes);
