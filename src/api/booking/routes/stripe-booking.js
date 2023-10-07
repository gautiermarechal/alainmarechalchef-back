module.exports = {
  routes: [
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
  ],
};
