import { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ChevronDown,
  Home,
  MapPin,
  Mail,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import "./index.css";

const welcomeCardStyles = `
.welcome-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 90%;
  width: 400px;
  z-index: 1000;
  animation: fadeInOut 5s forwards;
  opacity: 0;
}

.welcome-card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 0.75rem;
}

.welcome-card-message {
  font-size: 1.125rem;
  color: #4b5563;
  margin-bottom: 1rem;
}

.welcome-card-emoji {
  font-size: 3rem;
  margin-bottom: 1rem;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -40%);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  85% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
}
`;

(function injectStyles() {
  if (!document.getElementById("welcome-card-styles")) {
    const styleElement = document.createElement("style");
    styleElement.id = "welcome-card-styles";
    styleElement.innerHTML = welcomeCardStyles;
    document.head.appendChild(styleElement);
  }
})();

class SignupPage extends Component {
  state = {
    name: "",
    email: "",
    role: "",
    // phone: "",
    // profession: "",
    location: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    showConfirmPassword: false,
    errors: {},
    isSubmitting: false,
    redirectToLogin: false,
    showWelcomeCard: false,
    agreeToTerms: false,
    isGettingLocation: false,
    // OTP related states
    showOtpVerification: false,
    otp: ["", "", "", "", "", ""],
    otpError: "",
    isOtpSubmitting: false,
    otpResendCountdown: 0,
    userDataForOtp: null,
  };

  // Backend URLs
  backendUrls = [
    process.env.REACT_APP_API_URL, // Production/Render
    "http://localhost:5000", // Local development (keep for dev)
  ];

  componentDidMount() {
    // Check if NavBar has already determined the backend URL
    if (!window.backendUrl) {
      this.checkBackendAvailability();
    }
  }

  // Check which backend is available
  checkBackendAvailability = async () => {
    if (window.backendUrl) {
      console.log("Using already detected backend URL:", window.backendUrl);
      return;
    }

    let workingUrl = null;

    for (const url of this.backendUrls) {
      try {
        // Simple ping to see if this backend is responding
        const response = await fetch(`${url}/api/test-connection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ test: true }),
          // Short timeout to fail fast
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          console.log(`Backend available at: ${url}`);
          workingUrl = url;
          break;
        }
      } catch (error) {
        console.log(`Backend at ${url} not available:`, error.message);
      }
    }

    // If we found a working URL, save it
    if (workingUrl) {
      window.backendUrl = workingUrl;
      console.log("Using backend at:", workingUrl);
    } else {
      // Default to production URL if none respond
      window.backendUrl = this.backendUrls[0];
      console.log("No backend responding, defaulting to:", window.backendUrl);
    }
  };

  // Get the current backend URL
  getBackendUrl = () => {
    return window.backendUrl || this.backendUrls[0];
  };

  handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    this.setState({
      [name]: type === "checkbox" ? checked : value,
    });
  };

  togglePasswordVisibility = (field) => {
    this.setState((prevState) => ({
      [field]: !prevState[field],
    }));
  };

  getCurrentLocation = () => {
    if (!navigator.geolocation) {
      this.setState({
        errors: {
          ...this.state.errors,
          location: "Geolocation is not supported by this browser.",
        },
      });
      return;
    }

    this.setState({ isGettingLocation: true });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Use reverse geocoding to get address from coordinates
        this.reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "Unable to get your current location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access was denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
          default:
            errorMessage = "An unknown error occurred while getting location.";
            break;
        }

        this.setState({
          isGettingLocation: false,
          errors: {
            ...this.state.errors,
            location: errorMessage,
          },
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  reverseGeocode = async (latitude, longitude) => {
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error("Failed to get address");
      }

      const data = await response.json();

      if (data.display_name) {
        // Extract city, state, and country from the display name
        const addressParts = data.display_name.split(", ");
        let location = "";

        // Try to get city, state, and country
        if (addressParts.length >= 3) {
          // Get the city (usually the first part after street)
          const cityIndex = Math.min(2, addressParts.length - 3);
          const city = addressParts[cityIndex];

          // Get the state/province (usually the second to last part)
          const stateIndex = addressParts.length - 2;
          const state = addressParts[stateIndex];

          // Get the country (last part)
          const country = addressParts[addressParts.length - 1];

          location = `${city}, ${state}, ${country}`;
        } else if (addressParts.length >= 2) {
          // Fallback if we only have city and country
          const cityIndex = Math.min(2, addressParts.length - 2);
          const city = addressParts[cityIndex];
          const country = addressParts[addressParts.length - 1];
          location = `${city}, ${country}`;
        } else {
          location = data.display_name;
        }

        this.setState({
          location,
          isGettingLocation: false,
          errors: {
            ...this.state.errors,
            location: null,
          },
        });
      } else {
        throw new Error("No address found");
      }
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      this.setState({
        isGettingLocation: false,
        errors: {
          ...this.state.errors,
          location:
            "Unable to get address from coordinates. Please enter location manually.",
        },
      });
    }
  };

  validateForm = () => {
    const { name, email, role, location, password, confirmPassword } =
      this.state;
    const errors = {};

    if (name.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = "Invalid email address";
    }

    if (!role) {
      errors.role = "Please select a role";
    }

    // if (!profession) {
    //   errors.profession = "Please enter your profession";
    // }

    if (!location) {
      errors.location = "Please enter your location";
    }

    // Updated phone validation - more flexible
    // if (!phone) {
    //   errors.phone = "Phone number is required";
    // } else if (phone.length < 10) {
    //   errors.phone = "Phone number must be at least 10 digits";
    // }

    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    if (!this.state.agreeToTerms) {
      errors.agreeToTerms =
        "Please agree to the Terms & Conditions and Privacy Policy";
    }

    this.setState({ errors });

    return Object.keys(errors).length === 0;
  };

  // OTP handling methods
  handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...this.state.otp];
    newOtp[index] = value;

    this.setState({
      otp: newOtp,
      otpError: "", // Clear error when user types
    });

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.querySelector(
        `input[data-otp-index="${index + 1}"]`
      );
      if (nextInput) nextInput.focus();
    }
  };

  handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !this.state.otp[index] && index > 0) {
      const prevInput = document.querySelector(
        `input[data-otp-index="${index - 1}"]`
      );
      if (prevInput) prevInput.focus();
    }
  };

  handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const otpArray = pastedData.split("");
      this.setState({
        otp: [...otpArray, ...Array(6 - otpArray.length).fill("")],
        otpError: "",
      });
    }
  };

  resendOtp = async () => {
    if (this.state.otpResendCountdown > 0) return;

    this.setState({ isOtpSubmitting: true });

    try {
      const baseUrl = this.getBackendUrl();
      await axios.post(
        `${baseUrl}/api/send-otp`,
        { email: this.state.email },
        {
          withCredentials: true,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // Start countdown
      this.setState({
        otpResendCountdown: 600,
        isOtpSubmitting: false,
      });

      this.setState({
        errors: {
          ...this.state.errors,
          general: "",
        },
        isSubmitting: false,
      });

      const countdownInterval = setInterval(() => {
        this.setState((prevState) => {
          if (prevState.otpResendCountdown <= 1) {
            clearInterval(countdownInterval);
            return { otpResendCountdown: 0 };
          }
          return { otpResendCountdown: prevState.otpResendCountdown - 1 };
        });
      }, 1000);
    } catch (error) {
      console.error("Error resending OTP:", error);
      this.setState({
        errors: {
          ...this.state.errors,
          general: "",
        },
        isSubmitting: false,
      });
      this.setState({
        isOtpSubmitting: false,
        otpError: "Failed to resend OTP. Please try again.",
      });
    }
  };

  verifyOtp = async () => {
    const otpString = this.state.otp.join("");

    if (otpString.length !== 6) {
      this.setState({ otpError: "Please enter the complete 6-digit OTP" });
      return;
    }

    this.setState({ isOtpSubmitting: true, otpError: "" });

    try {
      const baseUrl = this.getBackendUrl();
      const response = await axios.post(
        `${baseUrl}/api/verify-otp`,
        {
          email: this.state.email,
          otp: otpString,
        },
        {
          withCredentials: true,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // if (response.data && response.data.success) {
      //   // OTP verified successfully, proceed with registration
      //   this.completeRegistration();
      // }
      // In verifyOtp()
      if (response.data && response.data.success && response.data.user) {
        const userData = response.data.user;
        console.log("OTP verified successfully, user data:", userData);
        localStorage.removeItem("user");
        await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure clean state
        localStorage.setItem("user", JSON.stringify(userData));

        // Trigger login effect
        if (window.navbarComponent?.prepareForLogin) {
          window.navbarComponent.prepareForLogin();
        }
        this.notifyNavBarOfLogin(userData);

        // 💡 Update completeRegistration to skip localStorage override
        this.completeRegistration(); // <- Don't store again in completeRegistration
      } else {
        this.setState({
          otpError: "Invalid OTP. Please check and try again.",
          isOtpSubmitting: false,
        });
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      this.setState({
        otpError:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Verification failed. Please try again.",
        isOtpSubmitting: false,
      });
    }
  };

  notifyNavBarOfLogin = (userData) => {
    console.log("Attempting to notify NavBar using all methods");

    // Method 1: Direct call to global showLoginNotification function
    if (window.showLoginNotification) {
      console.log("Using global showLoginNotification");
      window.showLoginNotification();
    }
    // Method 2: Call handleLogin on NavBar component
    else if (
      window.navbarComponent &&
      typeof window.navbarComponent.handleLogin === "function"
    ) {
      console.log("Using NavBar component handleLogin");
      window.navbarComponent.handleLogin(userData);
    }
    // Method 3: Manually trigger storage event (probably won't work in same window)
    else {
      console.log("Attempting to trigger storage event manually");
      try {
        const storageEvent = new Event("storage");
        storageEvent.key = "user";
        storageEvent.newValue = JSON.stringify(userData);
        window.dispatchEvent(storageEvent);
      } catch (error) {
        console.error("Error dispatching storage event:", error);
      }
    }

    // Method 4: Directly get NavBar to load user data
    if (
      window.navbarComponent &&
      typeof window.navbarComponent.loadUserData === "function"
    ) {
      console.log("Directly calling loadUserData on NavBar");
      setTimeout(() => {
        window.navbarComponent.loadUserData();
      }, 500);
    }
  };

  completeRegistration = async () => {
    try {
      // Store user data in localStorage

      // Show welcome message if available
      if (window.showWelcomeMessage) {
        window.showWelcomeMessage();
      } else if (
        window.navbarComponent &&
        typeof window.navbarComponent.showWelcomeMessage === "function"
      ) {
        window.navbarComponent.showWelcomeMessage();
      }

      // Show welcome card
      this.setState({
        showWelcomeCard: true,
        isOtpSubmitting: false,
        showOtpVerification: false,
      });

      // Hide welcome card and redirect after 5 seconds
      setTimeout(() => {
        this.setState({
          showWelcomeCard: false,
          redirectToLogin: true,
        });
      }, 5000);
    } catch (error) {
      console.error("Error completing registration:", error);
      this.setState({
        isOtpSubmitting: false,
        otpError: "Registration completion failed. Please try again.",
      });
    }
  };

  // completeRegistration = async () => {
  //   try {
  //     // Store user data in localStorage
  //     const userData = this.state.userDataForOtp;
  //     console.log("Storing user data in localStorage:", userData);
  //     localStorage.setItem("user", JSON.stringify(userData));

  //     // Show welcome message if available
  //     if (window.showWelcomeMessage) {
  //       window.showWelcomeMessage();
  //     } else if (
  //       window.navbarComponent &&
  //       typeof window.navbarComponent.showWelcomeMessage === "function"
  //     ) {
  //       window.navbarComponent.showWelcomeMessage();
  //     } else {
  //       // If no welcome message function is available, trigger login notification as fallback
  //       if (
  //         window.navbarComponent &&
  //         typeof window.navbarComponent.handleLogin === "function"
  //       ) {
  //         window.navbarComponent.handleLogin(userData);
  //       }
  //     }

  //     // Show welcome card
  //     this.setState({
  //       showWelcomeCard: true,
  //       isOtpSubmitting: false,
  //       showOtpVerification: false,
  //     });

  //     // Hide welcome card and redirect after 5 seconds
  //     setTimeout(() => {
  //       this.setState({
  //         showWelcomeCard: false,
  //         redirectToLogin: true,
  //       });
  //     }, 5000);
  //   } catch (error) {
  //     console.error("Error completing registration:", error);
  //     this.setState({
  //       isOtpSubmitting: false,
  //       otpError: "Registration completion failed. Please try again.",
  //     });
  //   }
  // };

  // completeRegistration = () => {
  //   if (window.showWelcomeMessage) {
  //     window.showWelcomeMessage();
  //   } else if (window.navbarComponent?.showWelcomeMessage) {
  //     window.navbarComponent.showWelcomeMessage();
  //   } else if (window.navbarComponent?.handleLogin) {
  //     const storedUser = JSON.parse(localStorage.getItem("user"));
  //     if (storedUser) {
  //       window.navbarComponent.handleLogin(storedUser);
  //     }
  //   }
  // };

  handleSubmit = async (e) => {
    e.preventDefault();

    if (this.validateForm()) {
      this.setState({ isSubmitting: true });

      try {
        // Get the current backend URL
        const baseUrl = this.getBackendUrl();
        console.log("Using backend URL for signup:", baseUrl);

        // Send registration data to get OTP
        const response = await axios.post(
          `${baseUrl}/api/signup`,
          {
            name: this.state.name,
            email: this.state.email,
            password: this.state.password,
            role: this.state.role,
            location: this.state.location,
          },
          {
            withCredentials: true,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );

        console.log("API signup response:", response.data);

        if (response.data && response.data.success) {
          // Store user data temporarily for OTP verification
          const userData = response.data.user;
          this.setState({
            userDataForOtp: userData,
            showOtpVerification: true,
            isSubmitting: false,
            otpResendCountdown: 600, // Start countdown for resend
          });

          // Start countdown for resend
          const countdownInterval = setInterval(() => {
            this.setState((prevState) => {
              if (prevState.otpResendCountdown <= 1) {
                clearInterval(countdownInterval);
                return { otpResendCountdown: 0 };
              }
              return { otpResendCountdown: prevState.otpResendCountdown - 1 };
            });
          }, 1000);
        } else {
          throw new Error("Invalid response from API");
        }
      } catch (error) {
        const serverMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Something went wrong. Please try again.";

        console.error("Registration error:", error);
        this.setState({
          errors: {
            ...this.state.errors,
            general: serverMessage,
          },
          isSubmitting: false,
        });
      }
    }
  };

  render() {
    const {
      errors,
      showPassword,
      showConfirmPassword,
      isSubmitting,
      redirectToLogin,
      showWelcomeCard,
      name,
      isGettingLocation,
      showOtpVerification,
      otp,
      otpError,
      isOtpSubmitting,
      otpResendCountdown,
    } = this.state;

    // Redirect to login page if registration was successful
    if (redirectToLogin) {
      return <Navigate to="/" />;
    }

    // Show OTP verification screen
    if (showOtpVerification) {
      return (
        <div className="register-screen">
          <Link to="/" className="register-home-button">
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          <div className="register-container">
            <div className="register-form-wrapper otp-verification-wrapper">
              <div className="otp-header">
                <button
                  onClick={() => this.setState({ showOtpVerification: false })}
                  className="otp-back-button"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back</span>
                </button>

                <div className="otp-icon-wrapper">
                  <Mail className="h-8 w-8" />
                </div>

                <h2 className="otp-title">Verify your email</h2>
                <p className="otp-subtitle">
                  We've sent a 6-digit verification code to
                  <br />
                  <strong>{this.state.email}</strong>
                </p>
              </div>

              <div className="otp-input-container">
                <div className="otp-inputs">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="number"
                      maxLength="1"
                      value={digit}
                      onChange={(e) =>
                        this.handleOtpChange(index, e.target.value)
                      }
                      onKeyDown={(e) => this.handleOtpKeyDown(index, e)}
                      onPaste={this.handleOtpPaste}
                      data-otp-index={index}
                      className={`otp-input ${digit ? "filled" : ""}`}
                      placeholder="•"
                      style={{ overflow: "hidden" }}
                    />
                  ))}
                </div>

                {otpError && <p className="otp-error">{otpError}</p>}
              </div>

              <button
                onClick={this.verifyOtp}
                disabled={isOtpSubmitting || otp.join("").length !== 6}
                className="otp-verify-button"
              >
                {isOtpSubmitting ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Complete Registration"
                )}
              </button>

              <div className="otp-resend-section">
                <p className="otp-resend-text">Didn't receive the code?</p>
                <button
                  onClick={this.resendOtp}
                  disabled={otpResendCountdown > 0 || isOtpSubmitting}
                  className="otp-resend-button"
                >
                  {otpResendCountdown > 0
                    ? `Resend in ${otpResendCountdown}s`
                    : "Resend code"}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="register-screen">
        <Link to="/" className="register-home-button">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <div className="register-container">
          <h2 className="register-title">Create your account</h2>

          <div className="register-form-wrapper">
            <form className="register-form" onSubmit={this.handleSubmit}>
              {/* Two column layout for Name and Email */}
              <div className="register-row">
                {/* Name Input */}
                <div className="register-input-group">
                  <label htmlFor="name" className="register-label">
                    Full Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    value={this.state.name}
                    onChange={this.handleInputChange}
                    className="register-input"
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="register-input-error">{errors.name}</p>
                  )}
                </div>

                {/* Email Input */}
                <div className="register-input-group">
                  <label htmlFor="email" className="register-label">
                    Email address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={this.state.email}
                    onChange={this.handleInputChange}
                    className="register-input"
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="register-input-error">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Two column layout for Role and Location */}
              <div className="register-row">
                {/* Role Input */}
                <div className="register-input-group">
                  <label htmlFor="role" className="register-label">
                    Role
                  </label>
                  <div className="register-select-container">
                    <select
                      name="role"
                      value={this.state.role}
                      onChange={this.handleInputChange}
                      className="register-input"
                    >
                      <option value="">Select your role</option>
                      <option value="Freelancer/Service Provider">
                        Freelancer/Service Provider
                      </option>
                      <option value="Client/Individual">
                        Client/Individual
                      </option>
                    </select>
                    <div className="register-select-icon">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  {errors.role && (
                    <p className="register-input-error">{errors.role}</p>
                  )}
                </div>

                {/* Location Input */}
                <div className="register-input-group">
                  <label htmlFor="location" className="register-label">
                    Location
                  </label>
                  <div className="register-location-container">
                    <input
                      name="location"
                      type="text"
                      value={this.state.location}
                      onChange={this.handleInputChange}
                      className="register-input"
                      placeholder="Enter your location"
                    />
                    <button
                      type="button"
                      onClick={this.getCurrentLocation}
                      disabled={isGettingLocation}
                      className="register-location-button"
                      title=""
                    >
                      {isGettingLocation ? (
                        <div className="register-location-spinner"></div>
                      ) : (
                        <MapPin className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="register-location-tooltip">
                        Get current location
                      </span>
                    </button>
                  </div>
                  {errors.location && (
                    <p className="register-input-error">{errors.location}</p>
                  )}
                </div>
              </div>

              {/* Two column layout for Profession and Phone Number */}
              <div className="register-row">
                {/* Profession Input */}
                {/* <div className="register-input-group">
                  <label htmlFor="profession" className="register-label">
                    Profession
                  </label>
                  <input
                    name="profession"
                    type="text"
                    value={this.state.profession}
                    onChange={this.handleInputChange}
                    className="register-input"
                    placeholder="Enter your profession"
                  />
                  {errors.profession && (
                    <p className="register-input-error">{errors.profession}</p>
                  )}
                </div> */}

                {/* Phone Number Input */}
                {/* <div className="register-input-group">
                  <label htmlFor="phone" className="register-label">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={this.state.phone}
                    onChange={this.handleInputChange}
                    className="register-input"
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <p className="register-input-error">{errors.phone}</p>
                  )}
                </div> */}
              </div>

              {/* Two column layout for Password fields */}
              <div className="register-row">
                {/* Password Input */}
                <div className="register-input-group">
                  <label htmlFor="password" className="register-label">
                    Password
                  </label>
                  <div className="register-password-container">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={this.state.password}
                      onChange={this.handleInputChange}
                      className="register-input"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        this.togglePasswordVisibility("showPassword")
                      }
                      className="register-password-toggle"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="register-input-error">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="register-input-group">
                  <label htmlFor="confirmPassword" className="register-label">
                    Confirm Password
                  </label>
                  <div className="register-password-container">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={this.state.confirmPassword}
                      onChange={this.handleInputChange}
                      className="register-input"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        this.togglePasswordVisibility("showConfirmPassword")
                      }
                      className="register-password-toggle"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="register-input-error">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Terms & Conditions Checkbox */}

              <div className="register-input-group">
                <label className="register-checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={this.state.agreeToTerms}
                    onChange={this.handleInputChange}
                    className="register-checkbox"
                  />
                  <span className="register-checkbox-text">
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="register-link">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy-policy"
                      target="_blank"
                      className="register-link"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="register-input-error">{errors.agreeToTerms}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="register-submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Register"}
              </button>
              {errors.general && (
                <div className="register-error-alert">{errors.general}</div>
              )}
            </form>

            {/* Login Link */}
            <div className="register-divider">
              <div className="register-divider-line"></div>
              <div className="register-divider-text">
                <span className="register-divider-content">
                  Already have an account?
                </span>
              </div>
            </div>

            <Link to="/login" className="register-login-link">
              Login
            </Link>
          </div>
        </div>

        {/* Welcome Card */}
        {showWelcomeCard && (
          <div className="welcome-card">
            <div className="welcome-card-emoji">🚀</div>
            <h2 className="welcome-card-title">Thank You for Registering!</h2>
            <p className="welcome-card-message">
              Welcome to VOAT Network, {name}!
            </p>
          </div>
        )}
      </div>
    );
  }
}

export default SignupPage;
