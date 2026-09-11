import { renderToStaticMarkup } from "react-dom/server";

import CheckoutPage from "../../app/checkout/page";

describe("app/checkout/page", () => {
  it("keeps checkout visible and unavailable", async () => {
    const page = await CheckoutPage();

    expect(renderToStaticMarkup(page)).toContain(
      "Checkout is currently unavailable",
    );
  });
});
