"use strict";

/**
 * booking controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { Stripe } = require("stripe");
// TODO: Add production key when ready
const stripe = new Stripe(process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

module.exports = createCoreController("api::booking.booking", ({ strapi }) => ({
  async createStripeBookingPayment(ctx) {
    try {
      const { courseId, email, telephone, date, prenom, nom } =
        ctx.request.body;

      if (!courseId) {
        return ctx.throw(400, "Please specify a course");
      }

      const realCourse = await strapi
        .service("api::course.course")
        .findOne(courseId);

      if (!realCourse) {
        return ctx.throw(404, "No course with this id");
      }

      if (realCourse.capacity === 0) {
        return ctx.throw(402, "This course is not available anymore");
      }

      const BASE_URL = ctx.request.header.origin || "http://localhost:1337";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        mode: "payment",
        // TODO: change this
        success_url: `${BASE_URL}/payment-success`,
        cancel_url: BASE_URL,
        line_items: [
          {
            price_data: {
              currency: "eur",
              unit_amount: realCourse.prix * 100,
              product_data: {
                name: realCourse.nom,
                description: `Rendez vous le
                ${new Date(realCourse.date).toLocaleString("fr-FR", {
                  timeZone: "UTC",
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "numeric",
                  minute: "numeric",
                })} 👨‍🍳👨‍🍳👨‍🍳`,
              },
            },
            quantity: 1,
          },
        ],
      });

      const newBooking = await strapi.service("api::booking.booking").create({
        data: {
          email,
          telephone,
          prenom,
          nom,
          cours: realCourse,
          paiement: null,
          status: "pending",
          date,
          checkout_session_stripe: session.id,
          publishedAt: new Date(),
        },
      });

      if (!newBooking) {
        return ctx.throw(409, "Could not create a booking");
      }

      const newPayment = await strapi.service("api::payment.payment").create({
        data: {
          date: new Date(),
          prix: realCourse.prix,
          stripeId: session.payment_link,
          checkout_url: session.url,
          status: "pending",
          reservation: newBooking,
        },
      });

      if (!newPayment) {
        return ctx.throw(409, "Could not create a new payment");
      }

      return {
        status: 200,
        message: "Successfully created a new booking pending.",
        data: { booking_created: newBooking, stripe_session_id: session.url },
      };
    } catch (error) {
      return ctx.throw(500, error.message || "An error occured.");
    }
  },
  async confirmStripeBookingPayment(ctx) {
    try {
      const { bookingId, courseId, paymentId } = ctx.request.body;

      if (!bookingId) {
        return { status: 400, message: "Missing booking ID" };
      }

      if (!courseId) {
        return { status: 400, message: "Missing course ID" };
      }

      const realBooking = await strapi.entityService.update(
        "api::booking.booking",
        bookingId,
        {
          data: {
            status: "confirmed",
          },
        }
      );

      const foundCourse = await strapi
        .service("api::course.course")
        .findOne(courseId);

      const realCourse = await strapi.entityService.update(
        "api::course.course",
        courseId,
        {
          data: {
            capacity: foundCourse.capacity - 1,
          },
        }
      );

      const realPayment = await strapi.entityService.update(
        "api::payment.payment",
        paymentId,
        {
          data: {
            status: "paid",
          },
        }
      );

      return {
        status: 200,
        data: {
          booking: realBooking,
          course: realCourse,
          payment: realPayment,
        },
      };
    } catch (error) {
      return { status: 500, message: error.message || "An error occured" };
    }
  },
}));
