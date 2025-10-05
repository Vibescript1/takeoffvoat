import { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import {
  Home,
  Shield,
  Eye,
  Lock,
  Database,
  UserCheck,
  Cookie,
} from "lucide-react";
import "./index.css";

class ShippingPolicyPage extends Component {
  state = {
    acceptedPolicy: false,
    isSubmitting: false,
    redirectToLogin: false,
    errors: {},
  };

  // Handle checkbox change
  handleCheckboxChange = () => {
    this.setState((prevState) => ({
      acceptedPolicy: !prevState.acceptedPolicy,
      errors: {}, // Clear errors when checkbox is toggled
    }));
  };

  // Handle form submission
  handleSubmit = async (e) => {
    e.preventDefault();

    if (!this.state.acceptedPolicy) {
      this.setState({
        errors: {
          general:
            "Please accept the Shipping & Delivery Policy terms to continue.",
        },
      });
      return;
    }

    this.setState({ isSubmitting: true, errors: {} });

    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update user data with shipping policy acceptance
      const updatedUserData = {
        ...userData,
        shippingPolicyAccepted: true,
        shippingPolicyAcceptedAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Redirect to login page
      this.setState({ redirectToLogin: true });
    } catch (error) {
      console.error("Shipping policy submission error:", error);
      this.setState({
        errors: {
          general: "Something went wrong. Please try again.",
        },
        isSubmitting: false,
      });
    }
  };

  render() {
    const { acceptedPolicy, isSubmitting, redirectToLogin, errors } = this.state;

    // Redirect to login page if shipping policy was accepted
    if (redirectToLogin) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="shippingpolicy-screen">
        <Link to="/" className="shippingpolicy-home-button">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <div className="shippingpolicy-container">
          <div className="shippingpolicy-header">
            <Shield className="shippingpolicy-header-icon" />
            <h1 className="shippingpolicy-title">Shipping & Delivery Policy</h1>
            <p className="shippingpolicy-subtitle">
              Please review and accept our Shipping & Delivery Policy to continue
              using VOAT Network
            </p>
          </div>

          {errors.general && (
            <div className="shippingpolicy-error-alert">{errors.general}</div>
          )}

          <div className="shippingpolicy-content">
            <form onSubmit={this.handleSubmit} className="shippingpolicy-form">
              {/* Introduction */}
              <div className="shippingpolicy-section">
                <div className="shippingpolicy-section-header">
                  <Shield className="shippingpolicy-section-icon" />
                  <h3 className="shippingpolicy-section-title">Introduction</h3>
                </div>
                <div className="shippingpolicy-section-content">
                  <p>
                    <strong>Last updated on Jun 5 2025</strong>
                  </p>
                  <p>
                    For International buyers, orders are shipped and
                    delivered through registered international courier
                    companies and/or International speed post only.
                    For domestic buyers, orders are shipped through
                    registered domestic courier companies and/or
                    speed post only. Orders are shipped within 0-7
                    days or as per the delivery date agreed at the
                    time of order confirmation and delivering of the
                    shipment subject to Courier Company / post
                    office norms. VOAT NETWORK PRIVATE LIMITED is
                    not liable for any delay in delivery by the courier
                    company / postal authorities and only guarantees
                    to hand over the consignment to the courier
                    company or postal authorities within 0-7 days
                    from the date of the order and payment or as per
                    the delivery date agreed at the time of order
                    confirmation. Delivery of all orders will be to the
                    address provided by the buyer. Delivery of our
                    services will be confirmed on your mail ID as
                    specified during registration. For any issues in
                    utilizing our services you may contact our
                    helpdesk on 7799770919 or
                    admin@voatnetwork.in
                  </p>
                </div>
              </div>

              {/* Single Acceptance Checkbox */}
              <div className="shippingpolicy-acceptance-section">
                <div className="shippingpolicy-checkbox-container">
                  <label className="shippingpolicy-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedPolicy}
                      onChange={this.handleCheckboxChange}
                      className="shippingpolicy-checkbox"
                    />
                    <span className="shippingpolicy-checkbox-text">
                      I have read and agree to all the terms outlined in this
                      Shipping & Delivery Policy.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="shippingpolicy-submit-container">
                <button
                  type="submit"
                  className={`shippingpolicy-submit-button ${
                    !acceptedPolicy ? "shippingpolicy-submit-disabled" : ""
                  }`}
                  disabled={!acceptedPolicy || isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : "Accept Shipping & Delivery Policy & Continue"}
                </button>

                {!acceptedPolicy && (
                  <p className="shippingpolicy-submit-note">
                    Please accept the Shipping & Delivery Policy terms to
                    continue
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default ShippingPolicyPage;
