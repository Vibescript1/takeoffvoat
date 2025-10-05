import { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import {
  Home,
  Shield,
} from "lucide-react";
import "./index.css";

class CancellationReturnPolicyPage extends Component {
  state = {
    acceptedPolicy: false,
    isSubmitting: false,
    redirectToLogin: false,
    errors: {},
  };

  handleCheckboxChange = () => {
    this.setState((prevState) => ({
      acceptedPolicy: !prevState.acceptedPolicy,
      errors: {},
    }));
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    if (!this.state.acceptedPolicy) {
      this.setState({
        errors: {
          general:
            "Please accept the Cancellation & Return Policy terms to continue.",
        },
      });
      return;
    }

    this.setState({ isSubmitting: true, errors: {} });

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedUserData = {
        ...userData,
        cancellationReturnPolicyAccepted: true,
        cancellationReturnPolicyAcceptedAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));

      this.setState({ redirectToLogin: true });
    } catch (error) {
      console.error("Cancellation & Return policy submission error:", error);
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

    if (redirectToLogin) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="cancellationreturnpolicy-screen">
        <Link to="/" className="cancellationreturnpolicy-home-button">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <div className="cancellationreturnpolicy-container">
          <div className="cancellationreturnpolicy-header">
            <Shield className="cancellationreturnpolicy-header-icon" />
            <h1 className="cancellationreturnpolicy-title">
              Cancellation & Return Policy
            </h1>
            <p className="cancellationreturnpolicy-subtitle">
              Please review and accept our Cancellation & Return Policy to continue
              using VOAT Network
            </p>
          </div>

          {errors.general && (
            <div className="cancellationreturnpolicy-error-alert">{errors.general}</div>
          )}

          <div className="cancellationreturnpolicy-content">
            <form
              onSubmit={this.handleSubmit}
              className="cancellationreturnpolicy-form"
            >
              {/* Introduction */}
              <div className="cancellationreturnpolicy-section">
                <div className="cancellationreturnpolicy-section-header">
                  <Shield className="cancellationreturnpolicy-section-icon" />
                  <h3 className="cancellationreturnpolicy-section-title">Introduction</h3>
                </div>
                <div className="cancellationreturnpolicy-section-content">
                  <p>
                    <strong>Last updated on Jul 25, 2025</strong>
                  </p>
                  <p>
                    Customers may cancel orders within 24 hours of placing the order.
                    Returns are accepted within 7 days of delivery subject to product
                    condition and company policies. For detailed information or to
                    raise a cancellation or return request, please contact our support
                    at 7799770919 or admin@voatnetwork.in.
                  </p>
                </div>
              </div>

              {/* Acceptance Checkbox */}
              <div className="cancellationreturnpolicy-acceptance-section">
                <div className="cancellationreturnpolicy-checkbox-container">
                  <label className="cancellationreturnpolicy-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedPolicy}
                      onChange={this.handleCheckboxChange}
                      className="cancellationreturnpolicy-checkbox"
                    />
                    <span className="cancellationreturnpolicy-checkbox-text">
                      I have read and agree to all the terms outlined in this
                      Cancellation & Return Policy.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="cancellationreturnpolicy-submit-container">
                <button
                  type="submit"
                  className={`cancellationreturnpolicy-submit-button ${
                    !acceptedPolicy ? "cancellationreturnpolicy-submit-disabled" : ""
                  }`}
                  disabled={!acceptedPolicy || isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : "Accept Cancellation & Return Policy & Continue"}
                </button>

                {!acceptedPolicy && (
                  <p className="cancellationreturnpolicy-submit-note">
                    Please accept the Cancellation & Return Policy terms to continue
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

export default CancellationReturnPolicyPage;
