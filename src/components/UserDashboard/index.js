import { Component } from "react";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid"; // For VOAT ID generation
import ProjectsPortfolioSelector from "../ProjectsPortfolioSelector";
import Catalogue from "../Catalogue";
import "./index.css";

class UserDashboard extends Component {
  state = {
    userData: null,
    isLoading: true,
    error: null,
    errorType: null,
    isEditing: false,
    activeTab: "profile",
    showPortfolioForm: false,
    portfolioStatus: null,
    orders: [],
    wishlist: [],
    bookings: [],
    notifications: [],
    stats: {},
    bookingFilter: "all", // for filtering bookings
    formData: {
      name: "",
      email: "",
      role: "",
      profession: "",
      phone: "",
    },
    portfolioFormData: {
      name: "",
      profession: "",
      headline: "",
      email: "",
      workExperience: "",
      portfolioLink: "",
      about: "",
      serviceName: "",
      serviceDescription: "",
      catalogueTags: [],
      pricing: [
        { level: "Basic", price: "", timeFrame: "" },
        { level: "Standard", price: "", timeFrame: "" },
        { level: "Premium", price: "", timeFrame: "" },
      ],
    },
    portfolioValidationErrors: {},
    tooltipTimer: null, // Timer for auto-clearing tooltips
    // New state for projects/portfolio
    projects: [
      {
        id: 1,
        images: [],
        price: "",
        title: "",
        description: "",
        githubLink: "",
        liveLink: "",
        technologies: "",
      },
      {
        id: 2,
        images: [],
        price: "",
        title: "",
        description: "",
        githubLink: "",
        liveLink: "",
        technologies: "",
      },
    ],
    profileImage: null,
    previewImage: null,
    resumeFileName: "",
    baseUrl:
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : process.env.REACT_APP_API_URL || // Production/Render
          "http://localhost:5000",
    showMobileSidebar: false,
    // New portfolio grid (replaces pricing packages)
    portfolioGrid: {
      rows: [
        { images: [null, null, null, null, null], price: "" },
      ],
    },
  };

  checkWishlistConsistency = async () => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData || !userData.id) return;

    try {
      // Get wishlist from localStorage
      const localWishlist = JSON.parse(
        localStorage.getItem(`wishlist_${userData.id}`) || "[]"
      );

      // Get wishlist from server
      const response = await fetch(
        `${this.state.baseUrl}/api/wishlist/${userData.id}`
      );

      if (response.ok) {
        const serverWishlist = await response.json();

        console.log("WISHLIST CONSISTENCY CHECK:");
        console.log("- Server wishlist items:", serverWishlist.length);
        console.log("- Local wishlist items:", localWishlist.length);

        // Check if they have the same number of items
        if (serverWishlist.length !== localWishlist.length) {
          console.warn(
            "⚠️ Wishlist inconsistency detected: different item counts"
          );

          // Log item IDs for comparison
          console.log(
            "Server item IDs:",
            serverWishlist.map((item) => item.id)
          );
          console.log(
            "Local item IDs:",
            localWishlist.map((item) => item.id)
          );
        } else {
          console.log("✅ Wishlist item counts match");
        }
      } else {
        console.warn(
          "⚠️ Could not fetch server wishlist for consistency check"
        );
      }
    } catch (error) {
      console.error("Error checking wishlist consistency:", error);
    }
  };

  componentDidMount() {
    // Add sample notifications
    this.setState({
      notifications: [
        {
          id: 1,
          type: "order",
          message: "Your order #ORD-004 has been accepted",
          time: "2 hours ago",
          read: false,
        },
        {
          id: 2,
          type: "system",
          message:
            "Welcome to VOAT Network! Complete your profile to get started.",
          time: "1 day ago",
          read: true,
        },
        {
          id: 3,
          type: "portfolio",
          message: "Your portfolio submission is under review",
          time: "3 days ago",
          read: true,
        },
      ],
      stats: {
        totalSpent: 1350,
        activeOrders: 2,
        completedOrders: 1,
        savedItems: 5,
      },
    });

    // Load user data (which now always fetches from database)
    this.loadUserData().then(() => {
      // After user data is loaded, fetch other data
      this.fetchPortfolioStatus().then(() => {
        this.fetchOrders();
        this.fetchWishlist();
        this.fetchBookings();
      });
    });

    this.checkWishlistConsistency();

    // Add periodic wishlist refresh every 10 seconds
    this.wishlistRefreshInterval = setInterval(() => {
      this.fetchWishlist();
    }, 10000);

    // Listen for wishlist updates from cart
    this.handleWishlistUpdate = this.handleWishlistUpdate.bind(this);
    window.addEventListener("wishlistUpdated", this.handleWishlistUpdate);

    // Load saved projects
    this.loadSavedProjects();
  }

  loadUserData = async () => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        let userData = JSON.parse(userDataString);

        // For new users, ensure VOAT ID exists before proceeding
        if (!userData.voatId) {
          console.log("New user detected, generating VOAT ID");
          const randomPart = uuidv4().substring(0, 9).toUpperCase();
          const voatId = `VOAT-${randomPart.substring(
            0,
            4
          )}-${randomPart.substring(4, 8)}`;

          userData.voatId = voatId;
          userData.voatPoints = userData.voatPoints || 0;
          userData.badge = userData.badge || this.calculateBadge(0);

          localStorage.setItem("user", JSON.stringify(userData));

          if (userData.id) {
            await this.updateUserDataInDatabase(userData);
          }
        }

        // Set initial state with localStorage data (WITHOUT profile image)
        this.setState({
          userData: userData,
          isLoading: true,
          formData: {
            name: userData.name || "",
            email: userData.email || "",
            role: userData.role || "",
            profession: userData.profession || "",
            phone: userData.phone || "",
          },
          // Don't set previewImage from localStorage - wait for database
          previewImage: null,
        });

        // Always fetch fresh data from database, especially profile image
        const freshUserData = await this.refreshUserFromDatabase();

        if (freshUserData) {
          // Update state with fresh data from database
          this.setState({
            userData: freshUserData,
            isLoading: false,
            formData: {
              name: freshUserData.name || "",
              email: freshUserData.email || "",
              role: freshUserData.role || "",
              profession: freshUserData.profession || "",
              phone: freshUserData.phone || "",
            },
            // Set profile image from database or null
            previewImage: freshUserData.profileImage
              ? this.getFullImageUrl(freshUserData.profileImage)
              : null,
          });
        } else {
          // Fallback to localStorage data if database fetch fails
          this.setState({
            isLoading: false,
            // Don't set profile image from localStorage
            previewImage: null,
          });
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        this.setState({
          isLoading: false,
          error: "Failed to parse user data. Please login again.",
          errorType: "parse_error",
        });
      }
    } else {
      this.setState({
        isLoading: false,
        error: "No user data found. Please login first.",
        errorType: "no_user",
      });
    }
  };

  componentWillUnmount() {
    if (this.wishlistRefreshInterval) {
      clearInterval(this.wishlistRefreshInterval);
    }
    if (this.portfolioStatusTimeout) {
      clearTimeout(this.portfolioStatusTimeout);
    }
    // Clear tooltip timer
    if (this.state.tooltipTimer) {
      clearTimeout(this.state.tooltipTimer);
    }
    // Remove event listener
    window.removeEventListener("wishlistUpdated", this.handleWishlistUpdate);
  }

  generateInitials = (name) => {
    if (!name || typeof name !== "string") return "U";

    // Clean the name and split by spaces
    const cleanName = name.trim();
    const words = cleanName.split(/\s+/).filter((word) => word.length > 0);

    if (words.length === 0) return "U";

    if (words.length === 1) {
      // Single word - take first two characters if available
      const word = words[0];
      if (word.length >= 2) {
        return word.substring(0, 2).toUpperCase();
      } else {
        return word.charAt(0).toUpperCase();
      }
    } else {
      // Multiple words - take first letter of first two words
      return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
    }
  };

  // Handle wishlist updates from cart
  handleWishlistUpdate = (event) => {
    console.log("=== DASHBOARD RECEIVED WISHLIST UPDATE ===");
    if (event.detail && event.detail.updatedWishlist) {
      this.setState({
        wishlist: event.detail.updatedWishlist,
        stats: {
          ...this.state.stats,
          savedItems: event.detail.updatedWishlist.length,
        },
      });
      console.log("Dashboard wishlist updated from cart sync");
    } else {
      // Fallback: refresh wishlist from server
      this.fetchWishlist();
    }
  };

  updateUserDataInDatabase = async (userData) => {
    try {
      if (!userData.id) {
        console.error("Cannot update database: User ID is missing");
        return false;
      }

      const updateData = {
        userId: userData.id,
        voatId: userData.voatId,
        voatPoints: userData.voatPoints,
        badge: userData.badge,
      };

      const response = await fetch(
        `${this.state.baseUrl}/api/update-user-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      // Either use the response data or don't fetch it
      if (response.ok) {
        return true;
      } else {
        console.error("Failed to update user data");
        return false;
      }
    } catch (error) {
      console.error("Error updating user data in database:", error);
      return false;
    }
  };

  refreshUserFromDatabase = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData || !userData.id) return null;

      console.log("Fetching fresh user data from database...");

      const response = await fetch(
        `${this.state.baseUrl}/api/user/${userData.id}`
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Fresh user data received:", result);

        // Merge database data with local data, prioritizing database values
        const updatedUserData = {
          ...userData, // Start with localStorage data
          ...result.user, // Override with database data
          // Ensure VOAT fields are preserved if they exist locally but not in DB
          voatId:
            result.user.voatId || userData.voatId || this.generateVoatId(),
          voatPoints:
            result.user.voatPoints !== undefined
              ? result.user.voatPoints
              : userData.voatPoints || 0,
          badge: result.user.badge || userData.badge || this.calculateBadge(0),
          // ALWAYS use database profile image (could be null)
          profileImage: result.user.profileImage,
        };

        // Update localStorage with fresh data
        localStorage.setItem("user", JSON.stringify(updatedUserData));

        console.log(
          "User data refreshed successfully, profile image:",
          updatedUserData.profileImage
        );
        return updatedUserData;
      } else {
        console.error("Failed to fetch user data from database");
        return null;
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      return null;
    }
  };

  refreshProfileImage = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData || !userData.id) return;

      console.log("Refreshing profile image from database...");

      const response = await fetch(
        `${this.state.baseUrl}/api/user/${userData.id}`
      );

      if (response.ok) {
        const result = await response.json();

        // Update only the profile image
        const updatedUserData = {
          ...userData,
          profileImage: result.user.profileImage || null,
        };

        localStorage.setItem("user", JSON.stringify(updatedUserData));

        this.setState({
          userData: updatedUserData,
          previewImage: result.user.profileImage
            ? this.getFullImageUrl(result.user.profileImage)
            : null,
        });

        console.log("Profile image refreshed:", result.user.profileImage);
      }
    } catch (error) {
      console.error("Error refreshing profile image:", error);
    }
  };

  isAdmin = () => {
    const { userData } = this.state;
    return userData && userData.email === "prasanya.webdev@gmail.com";
  };

  isFreelancer = () => {
    const { userData } = this.state;
    return userData && userData.role === "Freelancer/Service Provider";
  };

  generateVoatId = () => {
    // Generate a unique ID and format it as VOAT-XXXX-XXXX
    const randomPart = uuidv4().substring(0, 9).toUpperCase();
    return `VOAT-${randomPart.substring(0, 4)}-${randomPart.substring(4, 8)}`;
  };

  calculateBadge = (points) => {
    if (points >= 500) return "platinum";
    if (points >= 250) return "gold";
    if (points >= 100) return "silver";
    return "bronze";
  };

  fetchOrders = async () => {
    try {
      // Try to fetch from API
      const response = await fetch(
        `${this.state.baseUrl}/api/orders/${
          this.state.userData?.id || "unknown"
        }`
      );

      if (response.ok) {
        const orders = await response.json();
        this.setState({ orders });
      } else {
        // For demo purposes, add mock orders
        this.setState({
          orders: [
            {
              id: "ORD-001",
              service: "Logo Design",
              status: "Completed",
              date: "2025-03-10",
              amount: 150,
              provider: "Alex Johnson",
              providerImage: null,
            },
            {
              id: "ORD-002",
              service: "Website Development",
              status: "In Progress",
              date: "2025-04-01",
              amount: 850,
              provider: "Digital Maestros",
              providerImage: null,
            },
            {
              id: "ORD-003",
              service: "SEO Optimization",
              status: "Pending",
              date: "2025-04-12",
              amount: 350,
              provider: "Search Wizards",
              providerImage: null,
            },
            {
              id: "ORD-004",
              service: "Content Writing",
              status: "In Progress",
              date: "2025-05-05",
              amount: 225,
              provider: "Word Crafters",
              providerImage: null,
            },
          ],
        });
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      // Fallback to mock data if fetch fails
      this.setState({
        orders: [
          {
            id: "ORD-001",
            service: "Logo Design",
            status: "Completed",
            date: "2025-03-10",
            amount: 150,
            provider: "Alex Johnson",
            providerImage: null,
          },
          {
            id: "ORD-002",
            service: "Website Development",
            status: "In Progress",
            date: "2025-04-01",
            amount: 850,
            provider: "Digital Maestros",
            providerImage: null,
          },
          {
            id: "ORD-003",
            service: "SEO Optimization",
            status: "Pending",
            date: "2025-04-12",
            amount: 350,
            provider: "Search Wizards",
            providerImage: null,
          },
        ],
      });
    }
  };

  fetchBookings = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        return;
      }

      const response = await fetch(
        `${this.state.baseUrl}/api/bookings/${this.state.userData.id}`
      );

      if (response.ok) {
        const bookings = await response.json();
        this.setState({ bookings });
      } else {
        console.error("Failed to fetch bookings");
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  fetchWishlist = async () => {
    let userData;

    try {
      userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        console.log("No user data available, cannot fetch wishlist");
        this.setState({ wishlist: [] });
        return;
      }

      console.log("Fetching wishlist for user:", userData.id);

      // Fetch from API (this will use the new Wishlist collection)
      const response = await fetch(
        `${this.state.baseUrl}/api/wishlist/${userData.id}`
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${await response.text()}`
        );
      }

      const apiWishlist = await response.json();
      console.log("Wishlist from API:", apiWishlist);

      // Update state and localStorage
      this.setState({
        wishlist: Array.isArray(apiWishlist) ? apiWishlist : [],
        stats: {
          ...this.state.stats,
          savedItems: Array.isArray(apiWishlist) ? apiWishlist.length : 0,
        },
      });

      // Update localStorage to match database
      localStorage.setItem(
        `wishlist_${userData.id}`,
        JSON.stringify(apiWishlist)
      );
    } catch (error) {
      console.error("Error fetching wishlist:", error);

      // Fallback to localStorage - but only if userData exists
      if (userData && userData.id) {
        try {
          const localWishlist = JSON.parse(
            localStorage.getItem(`wishlist_${userData.id}`) || "[]"
          );

          this.setState({
            wishlist: localWishlist,
            stats: {
              ...this.state.stats,
              savedItems: localWishlist.length,
            },
          });
        } catch (localError) {
          console.error(
            "Error loading wishlist from localStorage:",
            localError
          );
          this.setState({ wishlist: [] });
        }
      } else {
        // No valid userData, set empty wishlist
        this.setState({ wishlist: [] });
      }
    }
  };

  refreshWishlist = async () => {
    await this.fetchWishlist();
  };

  fetchPortfolioStatus = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        console.log("No user data or user ID available");
        return;
      }

      const response = await fetch(
        `${this.state.baseUrl}/api/portfolio-status/${this.state.userData.id}`
      );

      if (response.ok) {
        const data = await response.json();

        // Clear any previous timeouts to avoid race conditions
        if (this.portfolioStatusTimeout) {
          clearTimeout(this.portfolioStatusTimeout);
        }

        this.setState({ portfolioStatus: data.status });
      } else {
        // Set status to null
        this.setState({ portfolioStatus: null });

        // Try alternative methods to check status
        this.checkLocalStorage();
        this.checkLocalSubmissions();
      }
    } catch (error) {
      console.error("Error fetching portfolio status:", error);
      // For demo purposes, try local checking as fallback
      this.checkLocalStorage();
      this.checkLocalSubmissions();
    }
  };

  checkLocalStorage = () => {
    try {
      // Try to get portfolio status from localStorage as a fallback
      const userId = this.state.userData?.id;
      if (!userId) return;

      const portfolioStatusKey = `portfolio_status_${userId}`;
      const storedStatus = localStorage.getItem(portfolioStatusKey);

      if (storedStatus) {
        this.setState({ portfolioStatus: storedStatus });
      } else {
        // Check if we need to create a default entry
        const userEmail = this.state.userData?.email;
        if (userEmail === "prasanya.webdev@gmail.com") {
          // Default admin to approved
          localStorage.setItem(portfolioStatusKey, "approved");
          this.setState({ portfolioStatus: "approved" });
        } else {
          // Default to null
          this.setState({ portfolioStatus: null });
        }
      }
    } catch (error) {
      console.error("Error checking localStorage:", error);
    }
  };

  checkLocalSubmissions = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        console.log("No user data available for local submissions check");
        return;
      }

      // First try to directly fetch the user's portfolio
      const portfolioResponse = await fetch(
        `${this.state.baseUrl}/api/portfolio/user/${this.state.userData.id}`
      );

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        if (portfolioData.hasPortfolio && portfolioData.portfolio) {
          this.setState({ portfolioStatus: portfolioData.portfolio.status });
          return;
        }
      }

      // If direct fetch fails, try the admin submissions endpoint
      const response = await fetch(
        `${this.state.baseUrl}/api/admin/portfolio-submissions`
      );

      if (response.ok) {
        const submissions = await response.json();
        // Find submission matching this user's ID
        const userSubmission = submissions.find(
          (sub) =>
            (sub.userId && sub.userId.toString() === this.state.userData.id) ||
            (sub.userId &&
              sub.userId._id &&
              sub.userId._id.toString() === this.state.userData.id) ||
            sub.email === this.state.userData.email
        );

        if (userSubmission) {
          this.setState({ portfolioStatus: userSubmission.status });
        }
      }
    } catch (error) {
      console.error("Error in local submissions check:", error);
    }
  };

  getFullImageUrl = (relativePath) => {
    if (!relativePath) return null;
    if (relativePath.startsWith("http")) return relativePath;
    if (relativePath.startsWith("data:")) return relativePath;
    return `${this.state.baseUrl}${relativePath}`;
  };

  handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  toggleEditMode = () => {
    this.setState((prevState) => ({
      isEditing: !prevState.isEditing,
      formData: !prevState.isEditing
        ? {
            name: this.state.userData.name || "",
            email: this.state.userData.email || "",
            role: this.state.userData.role || "",
            profession: this.state.userData.profession || "",
            phone: this.state.userData.phone || "",
          }
        : prevState.formData,
      // Only set previewImage from database profile image, not localStorage
      previewImage: !prevState.isEditing
        ? this.state.userData.profileImage
          ? this.getFullImageUrl(this.state.userData.profileImage)
          : null
        : this.state.previewImage,
      profileImage: !prevState.isEditing ? null : this.state.profileImage,
    }));
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      formData: {
        ...prevState.formData,
        [name]: value,
      },
    }));
  };

  handlePortfolioInputChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => {
      // Clear validation error for this field when user starts typing
      const updatedErrors = { ...prevState.portfolioValidationErrors };
      const hadError = updatedErrors[name];
      delete updatedErrors[name];

      // Clear timer if it exists
      if (prevState.tooltipTimer) {
        clearTimeout(prevState.tooltipTimer);
      }

      // Remove form expansion class if all errors are cleared and this field had an error
      const hasErrors = Object.keys(updatedErrors).length > 0;
      if (!hasErrors && hadError) {
        setTimeout(() => {
          const formContainer = document.querySelector('.portfolio-form-container');
          if (formContainer) {
            formContainer.classList.remove('has-validation-errors');
          }
        }, 100); // Small delay to ensure state has updated
      }

      return {
        portfolioFormData: {
          ...prevState.portfolioFormData,
          [name]: value,
        },
        portfolioValidationErrors: updatedErrors,
        tooltipTimer: null,
      };
    });
  };

  handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      const reader = new FileReader();
      reader.onloadend = () => {
        this.setState({
          previewImage: reader.result,
          profileImage: file,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  handleTabChange = (tab) => {
    this.setState({
      activeTab: tab,
      showPortfolioForm: false,
      showMobileSidebar: false, // Close mobile sidebar when tab changes
    });
  };

  toggleMobileSidebar = () => {
    this.setState((prevState) => ({
      showMobileSidebar: !prevState.showMobileSidebar,
    }));
  };

  togglePortfolioForm = () => {
    this.setState((prevState) => ({
      showPortfolioForm: !prevState.showPortfolioForm,
      showMobileSidebar: false, // Hide sidebar when showing portfolio form
      portfolioFormData: {
        name: this.state.userData?.name || "",
        profession: this.state.userData?.profession || "",
        headline: "",
        email: this.state.userData?.email || "",
        workExperience: "",
        portfolioLink: "",
        about: "",
        serviceName: "",
        serviceDescription: "",
        pricing: [
          { level: "Basic", price: "", timeFrame: "" },
          { level: "Standard", price: "", timeFrame: "" },
          { level: "Premium", price: "", timeFrame: "" },
        ],
      },
      portfolioValidationErrors: {}, // Clear validation errors
      tooltipTimer: null, // Clear timer
      resumeFileName: "",
    }));

    // Remove form expansion class when form is toggled
    const formContainer = document.querySelector('.portfolio-form-container');
    if (formContainer) {
      formContainer.classList.remove('has-validation-errors');
    }
  };

  handlePricingChange = (e, index) => {
    const { name, value } = e.target;
    this.setState((prevState) => {
      const updatedPricing = [...prevState.portfolioFormData.pricing];
      updatedPricing[index] = {
        ...updatedPricing[index],
        [name]: value,
      };

      return {
        portfolioFormData: {
          ...prevState.portfolioFormData,
          pricing: updatedPricing,
        },
      };
    });
  };

  handleBookingAction = async (bookingId, action) => {
    try {
      const response = await fetch(
        `${this.state.baseUrl}/api/booking/${bookingId}/action`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      if (response.ok) {
        // Refresh bookings after action
        this.fetchBookings();
        this.addNotification({
          type: "system",
          message: `Booking request ${action}ed successfully!`,
          time: "Just now",
        });
      } else {
        throw new Error(`Failed to ${action} booking`);
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      this.addNotification({
        type: "system",
        message: `Failed to ${action} booking request`,
        time: "Just now",
      });
    }
  };

  handleBookingFilterChange = (filter) => {
    this.setState({ bookingFilter: filter });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ isLoading: true });

    try {
      const { formData, profileImage, userData } = this.state;

      if (!userData.id) {
        this.setState({
          isLoading: false,
          error: "You need to login again before updating your profile.",
          errorType: "new_user_edit",
          isEditing: false,
        });
        return;
      }

      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("email", formData.email);
      submitData.append("role", formData.role);
      submitData.append("profession", formData.profession);
      submitData.append("phone", formData.phone);
      submitData.append("userId", userData.id);
      submitData.append("voatId", userData.voatId);
      submitData.append("voatPoints", userData.voatPoints);
      submitData.append("badge", userData.badge);

      if (profileImage) {
        submitData.append("profileImage", profileImage);
      }

      const response = await fetch(`${this.state.baseUrl}/api/update-profile`, {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const result = await response.json();

      // Force refresh user data from database to get the latest profile image
      const freshUserData = await this.refreshUserFromDatabase();

      if (freshUserData) {
        this.setState({
          userData: freshUserData,
          isLoading: false,
          isEditing: false,
          previewImage: freshUserData.profileImage
            ? this.getFullImageUrl(freshUserData.profileImage)
            : null,
        });
      } else {
        // Fallback to response data
        const updatedUserData = {
          ...userData,
          ...formData,
          profileImage: result.profileImage || userData.profileImage,
        };

        localStorage.setItem("user", JSON.stringify(updatedUserData));

        this.setState({
          userData: updatedUserData,
          isLoading: false,
          isEditing: false,
          previewImage:
            this.getFullImageUrl(result.profileImage) ||
            this.getFullImageUrl(userData.profileImage),
        });
      }

      // Add notification for profile update
      this.addNotification({
        type: "system",
        message: "Your profile has been updated successfully!",
        time: "Just now",
      });
    } catch (error) {
      console.error("Update error:", error);
      this.setState({
        isLoading: false,
        error: "Failed to update profile. Please try again.",
        errorType: "update_error",
      });
    }
  };

  validatePortfolioForm = () => {
    const { portfolioFormData, portfolioGrid } = this.state;
    const fieldErrors = {};

    // Check required text fields
    if (!portfolioFormData.name || portfolioFormData.name.trim() === '') {
      fieldErrors.name = 'Please fill out your full name';
    }

    if (!portfolioFormData.email || portfolioFormData.email.trim() === '') {
      fieldErrors.email = 'Please fill out your email address';
    }

    if (!portfolioFormData.profession || portfolioFormData.profession.trim() === '') {
      fieldErrors.profession = 'Please fill out your profession';
    }

    if (!portfolioFormData.headline || portfolioFormData.headline.trim() === '') {
      fieldErrors.headline = 'Please fill out your professional headline';
    }

    if (!portfolioFormData.about || portfolioFormData.about.trim() === '') {
      fieldErrors.about = 'Please fill out your about section';
    }

    if (!portfolioFormData.workExperience || portfolioFormData.workExperience.trim() === '') {
      fieldErrors.workExperience = 'Please fill out your work experience';
    }

    if (!portfolioFormData.serviceName || portfolioFormData.serviceName.trim() === '') {
      fieldErrors.serviceName = 'Please fill out your service name';
    }

    if (!portfolioFormData.serviceDescription || portfolioFormData.serviceDescription.trim() === '') {
      fieldErrors.serviceDescription = 'Please fill out your service description';
    }

    // Check catalogue tags
    if (!portfolioFormData.catalogueTags || portfolioFormData.catalogueTags.length === 0) {
      fieldErrors.catalogueTags = 'Please add at least one catalogue tag';
    }

    // Check portfolio grid - at least one row should have at least one image and a price
    const hasValidPortfolioEntry = portfolioGrid.rows.some(row => {
      const hasImage = row.images.some(image => image !== null);
      const hasPrice = row.price && row.price.trim() !== '';
      return hasImage && hasPrice;
    });

    if (!hasValidPortfolioEntry) {
      fieldErrors.portfolioGrid = 'Please add at least one portfolio entry with image and price';
    }

    return fieldErrors;
  };

  handlePortfolioSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    const validationErrors = this.validatePortfolioForm();
    
    if (Object.keys(validationErrors).length > 0) {
      // Clear any existing timer
      if (this.state.tooltipTimer) {
        clearTimeout(this.state.tooltipTimer);
      }

      // Set validation errors to show tooltips and expand form
      this.setState({ portfolioValidationErrors: validationErrors });

      // Add class to form container to expand it
      const formContainer = document.querySelector('.portfolio-form-container');
      if (formContainer) {
        formContainer.classList.add('has-validation-errors');
      }

      // Set timer to auto-clear tooltips after 3 seconds
      const timer = setTimeout(() => {
        this.setState({
          portfolioValidationErrors: {},
          tooltipTimer: null
        });
        // Remove form expansion class
        const container = document.querySelector('.portfolio-form-container');
        if (container) {
          container.classList.remove('has-validation-errors');
        }
      }, 3000);

      this.setState({ tooltipTimer: timer });

      return;
    }

    // Clear any previous validation errors and remove expansion class
    this.setState({ portfolioValidationErrors: {} });
    const formContainer = document.querySelector('.portfolio-form-container');
    if (formContainer) {
      formContainer.classList.remove('has-validation-errors');
    }

    this.setState({ isLoading: true, error: null });

    try {
      const { portfolioFormData, userData } = this.state;
      const baseUrl = this.state.baseUrl || "http://localhost:5000";

      // Skip the connection test and proceed directly to submission
      const formData = new FormData();

      // Add form data fields
      formData.append("name", portfolioFormData.name || "");
      formData.append("profession", portfolioFormData.profession || "");
      formData.append("headline", portfolioFormData.headline || "");
      formData.append("email", portfolioFormData.email);
      formData.append("workExperience", portfolioFormData.workExperience || "");
      formData.append("portfolioLink", portfolioFormData.portfolioLink || "");
      formData.append("about", portfolioFormData.about || "");

      // Make sure userId is included properly and is valid
      if (userData && userData.id) {
        formData.append("userId", userData.id);
      }

      // Add profile image or generate placeholder initials
      if (userData.profileImage) {
        // If user has a profile image, include the path
        formData.append("profileImagePath", userData.profileImage);
        formData.append("hasProfileImage", "true");
      } else {
        // Generate initials from user name
        const initials = this.generateInitials(userData.name);
        formData.append("profileInitials", initials);
        formData.append("userName", userData.name || "User");
        formData.append("hasProfileImage", "false");
      }

      // This indicates it's a new submission that needs admin review
      formData.append("isNewSubmission", "true");

      // Create a service object to append to the portfolio if provided
      if (
        portfolioFormData.serviceName &&
        portfolioFormData.serviceDescription
      ) {
        const service = {
          name: portfolioFormData.serviceName,
          description: portfolioFormData.serviceDescription,
          pricing: portfolioFormData.pricing || [],
        };

        // Stringify the service object to pass it in the form
        formData.append("service", JSON.stringify(service));
      }

      // Log the URL being used
      const requestUrl = `${baseUrl}/api/portfolio`;

      // Use try/catch specifically for the portfolio submission
      try {
        const response = await fetch(requestUrl, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          let errorMessage = `HTTP error ${response.status}`;
          try {
            const errorData = await response.text();
            errorMessage = `${errorMessage}: ${errorData}`;
          } catch (e) {
            // Ignore error parsing body
          }
          throw new Error(errorMessage);
        }

        // const result = await response.json();

        // Clear any previous status timeout
        if (this.portfolioStatusTimeout) {
          clearTimeout(this.portfolioStatusTimeout);
        }

        // Update the state immediately
        this.setState({
          isLoading: false,
          showPortfolioForm: false,
          portfolioStatus: "pending",
        });

        // Set a timeout to refresh the status in case there's a race condition
        this.portfolioStatusTimeout = setTimeout(() => {
          this.fetchPortfolioStatus();
        }, 1000);

        // Also add the service to the database with a separate API call
        if (userData && userData.id && portfolioFormData.serviceName) {
          try {
            const serviceData = {
              userId: userData.id,
              name: portfolioFormData.serviceName,
              description: portfolioFormData.serviceDescription,
              pricing: portfolioFormData.pricing || [],
            };

            const serviceResponse = await fetch(`${baseUrl}/api/add-service`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(serviceData),
            });

            if (serviceResponse.ok) {
              console.log("Service added successfully!");
            } else {
              console.error(
                "Failed to add service:",
                await serviceResponse.text()
              );
            }
          } catch (serviceError) {
            console.error("Error adding service:", serviceError);
          }
        }

        // Add notification
        this.addNotification({
          type: "portfolio",
          message: "Your portfolio has been submitted for review!",
          time: "Just now",
        });

        alert(
          "Portfolio submitted successfully! It will be reviewed by the admin."
        );
      } catch (fetchError) {
        console.error("Fetch error details:", fetchError);
        throw new Error(`Failed to submit portfolio: ${fetchError.message}`);
      }
    } catch (error) {
      console.error("Portfolio submission error:", error);

      this.setState({
        isLoading: false,
        error: error.message,
      });

      alert(`Failed to submit portfolio: ${error.message}`);
    }
  };

  handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      this.setState({
        resumeFileName: file.name,
        portfolioFormData: {
          ...this.state.portfolioFormData,
          resume: file,
        },
      });
      console.log("Resume file attached:", file.name);
    }
  };

  // New methods for project management
  addProject = () => {
    this.setState((prevState) => ({
      projects: [
        ...prevState.projects,
        {
          id: Date.now(),
          images: [],
          price: "",
          title: "",
          description: "",
          githubLink: "",
          liveLink: "",
          technologies: "",
        },
      ],
    }));
  };

  removeProject = (projectId) => {
    this.setState((prevState) => ({
      projects: prevState.projects.filter((project) => project.id !== projectId),
    }));
  };

  handleProjectChange = (projectId, field, value) => {
    this.setState((prevState) => ({
      projects: prevState.projects.map((project) =>
        project.id === projectId
          ? { ...project, [field]: value }
          : project
      ),
    }));
  };

  handleProjectImageUpload = (projectId, e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const imagePromises = files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(imagePromises).then((imageUrls) => {
        this.setState((prevState) => ({
          projects: prevState.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  images: [...project.images, ...imageUrls].slice(0, 4), // Limit to 4 images
                }
              : project
          ),
        }));
      });
    }
  };

  removeProjectImage = (projectId, imageIndex) => {
    this.setState(prevState => ({
      projects: prevState.projects.map(project =>
        project.id === projectId
          ? {
              ...project,
              images: project.images.filter((_, index) => index !== imageIndex)
            }
          : project
      )
    }));
  };

  handleViewPortfolio = () => {
    // Navigate to portfolio page or show a modal with portfolio details
    window.location.href = `/my-portfolio/${this.state.userData.id}`;
  };

  removeFromWishlist = async (itemId) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) return;

      // Calculate updated wishlist BEFORE updating state
      const updatedWishlist = this.state.wishlist.filter(
        (item) => item.id !== itemId
      );

      // Update local state immediately for better UX
      this.setState((prevState) => ({
        wishlist: prevState.wishlist.filter((item) => item.id !== itemId),
        stats: {
          ...prevState.stats,
          savedItems: updatedWishlist.length,
        },
      }));

      // Update localStorage
      localStorage.setItem(
        `wishlist_${userData.id}`,
        JSON.stringify(updatedWishlist)
      );

      // Try to update server - two approaches:
      // 1. Use the DELETE endpoint for the specific item
      try {
        const deleteResponse = await fetch(
          `${this.state.baseUrl}/api/wishlist/remove/${itemId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: userData.id }),
          }
        );

        if (!deleteResponse.ok) {
          throw new Error("Delete endpoint failed");
        }

        console.log("Item successfully removed from wishlist in database");
      } catch (deleteError) {
        console.error("Error with DELETE endpoint:", deleteError);

        // 2. Fallback: Update the entire wishlist
        try {
          await fetch(`${this.state.baseUrl}/api/wishlist/${userData.id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedWishlist),
          });

          console.log(
            "Wishlist successfully updated in database (fallback method)"
          );
        } catch (updateError) {
          console.error("Failed to update wishlist in database:", updateError);
        }
      }

      // Add notification
      this.addNotification({
        type: "system",
        message: "Item removed from your wishlist",
        time: "Just now",
      });
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
    }
  };

  markNotificationAsRead = (id) => {
    this.setState((prevState) => ({
      notifications: prevState.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
    }));
  };

  markAllNotificationsAsRead = () => {
    this.setState((prevState) => ({
      notifications: prevState.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }));
  };

  addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      read: false,
      ...notification,
    };

    this.setState((prevState) => ({
      notifications: [newNotification, ...prevState.notifications],
    }));
  };

  renderUserProfile() {
    const { userData, stats } = this.state;
    const profileImageUrl = this.getFullImageUrl(userData.profileImage);
    const badgeColors = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: "#FFD700",
      platinum: "#E5E4E2",
    };

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>My Dashboard</h1>
          <div className="dashboard-actions">
            <button className="notification-btn">
              <i className="fas fa-bell"></i>
              <span className="notification-badge">
                {this.state.notifications.filter((n) => !n.read).length}
              </span>
            </button>
            <div className="user-quick-info">
              <div className="user-avatar-small">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={userData.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {this.generateInitials(userData.name)}
                  </div>
                )}
              </div>
              <div className="user-name">{userData.name}</div>
            </div>
          </div>
        </div>

        <div className="profile-overview">
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-image-container">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={userData.name}
                    className="userdashboard-profile-image"
                  />
                ) : (
                  <div className="dashboard-profile-placeholder">
                    {this.generateInitials(userData.name)}
                  </div>
                )}
                <div
                  className="profile-badge"
                  style={{ backgroundColor: badgeColors[userData.badge] }}
                >
                  {userData.badge.charAt(0).toUpperCase() +
                    userData.badge.slice(1)}
                </div>
              </div>
              <div className="profile-details">
                <h2 className="profile-name">{userData.name}</h2>
                <p className="profile-profession">
                  {userData.profession || "Add your profession"}
                </p>
                <div className="profile-id">VOAT ID: {userData.voatId}</div>
                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="main-stat-value">
                      {userData.voatPoints || 0}
                    </span>
                    <span className="stat-label">VOAT Points</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="profile-card-body">
              <div className="profile-info-section">
                <div className="info-item">
                  <div className="info-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div className="info-content">
                    <span className="info-label">Email: </span>
                    <span className="info-value">{userData.email}</span>
                  </div>
                </div>
                {userData.phone && (
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="fas fa-phone"></i>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Phone: </span>
                      <span className="info-value">{userData.phone}</span>
                    </div>
                  </div>
                )}
                {userData.role && (
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="fas fa-user-tag"></i>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Role: </span>
                      <span className="info-value">{userData.role}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="profile-actions">
                <button className="btn btn-edit" onClick={this.toggleEditMode}>
                  <i className="fas fa-edit"></i> Edit Profile
                </button>
              </div>
            </div>
          </div>

          <div className="activity-summary">
            <div className="activity-card">
              <div className="activity-header">
                <h3>Account Stats</h3>
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="activity-body">
                <div className="activity-stats">
                  <div className="activity-stat">
                    <div className="stat-icon money">
                      <i class="fa-solid fa-indian-rupee-sign"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{stats.totalSpent || 0}</div>
                      <div className="stat-label">Total Spent</div>
                    </div>
                  </div>
                  <div className="activity-stat">
                    <div className="stat-icon orders">
                      <i className="fas fa-clipboard-list"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">
                        {stats.activeOrders || 0}
                      </div>
                      <div className="stat-label">Active Orders</div>
                    </div>
                  </div>
                  <div className="activity-stat">
                    <div className="stat-icon completed">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">
                        {stats.completedOrders || 0}
                      </div>
                      <div className="stat-label">Completed</div>
                    </div>
                  </div>
                  <div className="activity-stat">
                    <div className="stat-icon saved">
                      <i className="fas fa-heart"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{stats.savedItems || 0}</div>
                      <div className="stat-label">Saved Items</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="recent-activity-card">
              <div className="activity-header">
                <h3>Recent Activity</h3>
                <i className="fas fa-history"></i>
              </div>
              <div className="activity-body">
                <div className="activity-list">
                  {this.state.orders.slice(0, 3).map((order, index) => (
                    <div className="activity-item" key={index}>
                      <div className="activity-icon">
                        <i
                          className={`fas fa-${
                            order.status === "Completed"
                              ? "check-circle"
                              : order.status === "In Progress"
                              ? "spinner"
                              : "clock"
                          }`}
                        ></i>
                      </div>
                      <div className="activity-details">
                        <div className="activity-title">
                          {order.service}{" "}
                          <span
                            className={`status ${order.status
                              .toLowerCase()
                              .replace(" ", "-")}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="activity-meta">
                          <span className="activity-date">{order.date}</span>
                          <span className="activity-price">
                            ₹ {order.amount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {this.state.orders.length === 0 && (
                    <div className="empty-activity">
                      <i className="fas fa-info-circle"></i>
                      <p>No recent activity found</p>
                    </div>
                  )}
                </div>
                {this.state.orders.length > 0 && (
                  <button
                    className="btn btn-view-all"
                    onClick={() => this.handleTabChange("orders")}
                  >
                    View All Orders
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="notifications-panel">
          <div className="panel-header">
            <h3>Notifications</h3>
            <button
              className="btn-mark-all"
              onClick={this.markAllNotificationsAsRead}
              disabled={!this.state.notifications.some((n) => !n.read)}
            >
              Mark all as read
            </button>
          </div>
          <div className="notification-list">
            {this.state.notifications.length === 0 ? (
              <div className="empty-notifications">
                <i className="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
              </div>
            ) : (
              this.state.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.read ? "read" : "unread"
                  }`}
                  onClick={() => this.markNotificationAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    <i
                      className={`fas fa-${
                        notification.type === "order"
                          ? "shopping-cart"
                          : notification.type === "portfolio"
                          ? "briefcase"
                          : "bell"
                      }`}
                    ></i>
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-time">{notification.time}</div>
                  </div>
                  {!notification.read && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Projects Display Section - Only show for freelancers with saved projects */}
        {this.isFreelancer() && this.state.projects.some(project => project.title && project.isSaved) && (
          <div className="saved-projects-section">
            <div className="section-header">
              <h3><i className="fas fa-rocket"></i> My Portfolio Projects</h3>
              <button 
                className="btn btn-secondary" 
                onClick={() => this.handleTabChange("projects")}
              >
                <i className="fas fa-edit"></i> Edit Projects
              </button>
            </div>
            <div className="saved-projects-grid">
              {this.state.projects
                .filter(project => project.title && project.isSaved)
                .slice(0, 3)
                .map((project, index) => (
                  <div key={project.id} className="saved-project-card">
                    <div className="project-preview">
                      {project.images.length > 0 ? (
                        <img 
                          src={project.images[0]} 
                          alt={project.title}
                          className="project-preview-image"
                        />
                      ) : (
                        <div className="project-preview-placeholder">
                          <i className="fas fa-image"></i>
                        </div>
                      )}
                      <div className="project-preview-overlay">
                        <span className="project-number">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="project-preview-content">
                      <h4 className="project-title">{project.title}</h4>
                      <p className="project-description">
                        {project.description.length > 100 
                          ? `${project.description.substring(0, 100)}...` 
                          : project.description}
                      </p>
                      {project.technologies && (
                        <div className="project-technologies">
                          <span className="tech-label">Tech:</span>
                          <span className="tech-stack">{project.technologies}</span>
                        </div>
                      )}
                      {project.price && (
                        <div className="project-price">
                          <span className="price-label">Price:</span>
                          <span className="price-value">₹{project.price}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            {this.state.projects.filter(project => project.title && project.isSaved).length > 3 && (
              <div className="view-more-projects">
                <button 
                  className="btn btn-primary" 
                  onClick={() => this.handleTabChange("projects")}
                >
                  View All Projects
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  renderEditForm() {
    const { formData, previewImage } = this.state;

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <button className="btn btn-back" onClick={this.toggleEditMode}>
            <i className="fas fa-arrow-left"></i> Back to Profile
          </button>
        </div>

        <div className="edit-profile-container">
          <form onSubmit={this.handleSubmit} className="edit-profile-form">
            <div className="form-header">
              <div className="avatar-upload">
                <div className="avatar-preview">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile Preview"
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {formData.name
                        ? formData.name.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                  )}
                </div>
                <div className="avatar-actions">
                  <label htmlFor="profile-image" className="btn btn-upload">
                    <i className="fas fa-camera"></i> Change Photo
                  </label>
                  <input
                    type="file"
                    id="profile-image"
                    accept="image/*"
                    onChange={this.handleImageChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            </div>

            <div className="form-body">
              <div className="user-form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-container">
                  <i className="fas fa-user input-icon"></i>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={this.handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="user-form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-container">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={this.handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="user-form-group">
                <label htmlFor="phone">Phone Number</label>
                <div className="input-container">
                  <i className="fas fa-phone input-icon"></i>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={this.handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="user-form-group">
                <label htmlFor="role">Role</label>
                <div className="select-container">
                  <i className="fas fa-user-tag input-icon"></i>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={this.handleInputChange}
                    className="form-select"
                  >
                    <option value="">Select your role</option>
                    <option value="Freelancer/Service Provider">
                      Freelancer/Service Provider
                    </option>
                    <option value="Client/Individual">Client/Individual</option>
                  </select>
                </div>
              </div>

              <div className="user-form-group">
                <label htmlFor="profession">Profession</label>
                <div className="input-container">
                  <i className="fas fa-briefcase input-icon"></i>
                  <input
                    type="text"
                    id="profession"
                    name="profession"
                    value={formData.profession}
                    onChange={this.handleInputChange}
                    placeholder="Enter your profession"
                  />
                </div>
              </div>
            </div>

            <div className="form-footer">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={this.toggleEditMode}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-save">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  renderOrders() {
    const { orders } = this.state;

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>My Orders</h1>
          <div className="dashboard-actions">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search orders..."
                className="search-input"
              />
            </div>
            <select className="filter-dropdown">
              <option value="all">All Orders</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illustration">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <h3>No Orders Yet</h3>
            <p>
              You haven't placed any orders yet. Start exploring services to
              place your first order!
            </p>
            <button className="btn btn-primary">Explore Services</button>
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map((order, index) => (
              <div className="order-card" key={index}>
                <div className="order-header">
                  <div className="order-id">{order.id}</div>
                  <div
                    className={`order-status ${order.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    <i
                      className={`fas fa-${
                        order.status === "Completed"
                          ? "check-circle"
                          : order.status === "In Progress"
                          ? "spinner"
                          : "clock"
                      }`}
                    ></i>
                    {order.status}
                  </div>
                </div>
                <div className="order-body">
                  <h3 className="order-service">{order.service}</h3>
                  <div className="order-provider">
                    <i className="fas fa-user"></i>
                    <span>{order.provider}</span>
                  </div>
                  <div className="order-meta">
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>{order.date}</span>
                    </div>
                    <div className="meta-item">
                      <i class="fa-solid fa-indian-rupee-sign"></i>
                      <span>{order.amount}</span>
                    </div>
                  </div>
                </div>
                <div className="order-actions">
                  <button className="btn btn-details">View Details</button>
                  {order.status === "Completed" && (
                    <button className="btn btn-review">Leave Review</button>
                  )}
                  {order.status === "In Progress" && (
                    <button className="btn btn-message">
                      <i className="fas fa-comment"></i> Message
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  renderBookings() {
    const { bookings, bookingFilter } = this.state;

    // Filter bookings based on selected filter
    const filteredBookings = bookings.filter((booking) => {
      if (bookingFilter === "all") return true;
      return booking.status === bookingFilter;
    });

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>Service Bookings</h1>
          <div className="dashboard-actions">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search bookings..."
                className="search-input"
              />
            </div>
            <select
              className="filter-dropdown"
              value={bookingFilter}
              onChange={(e) => this.handleBookingFilterChange(e.target.value)}
            >
              <option value="all">All Bookings</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="booking-stats">
          <div className="stat-card">
            <div className="stat-icon pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-info">
              <div className="stat-number">
                {bookings.filter((b) => b.status === "pending").length}
              </div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accepted">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-info">
              <div className="stat-number">
                {bookings.filter((b) => b.status === "accepted").length}
              </div>
              <div className="stat-label">Accepted</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon rejected">
              <i className="fas fa-times-circle"></i>
            </div>
            <div className="stat-info">
              <div className="stat-number">
                {bookings.filter((b) => b.status === "rejected").length}
              </div>
              <div className="stat-label">Rejected</div>
            </div>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illustration">
              <i className="fas fa-calendar-check"></i>
            </div>
            <h3>No Booking Requests Yet</h3>
            <p>
              You haven't received any booking requests yet. Complete your
              portfolio to start receiving bookings!
            </p>
            {!this.state.portfolioStatus && (
              <button
                className="btn btn-primary"
                onClick={this.togglePortfolioForm}
              >
                Create Portfolio
              </button>
            )}
          </div>
        ) : (
          <div className="bookings-grid">
            {filteredBookings.map((booking, index) => (
              <div className="booking-card" key={index}>
                <div className="booking-header">
                  <div className="booking-id">
                    #{booking.id || `BK-${index + 1}`}
                  </div>
                  <div className={`booking-status ${booking.status}`}>
                    <i
                      className={`fas fa-${
                        booking.status === "accepted"
                          ? "check-circle"
                          : booking.status === "rejected"
                          ? "times-circle"
                          : "clock"
                      }`}
                    ></i>
                    {booking.status.charAt(0).toUpperCase() +
                      booking.status.slice(1)}
                  </div>
                </div>

                <div className="booking-body">
                  <div className="client-info">
                    <div className="client-avatar">
                      {booking.clientProfileImage ? (
                        <img
                          src={
                            booking.clientProfileImage.startsWith("http")
                              ? booking.clientProfileImage
                              : `${this.state.baseUrl}${booking.clientProfileImage}`
                          }
                          alt={booking.clientName}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="avatar-placeholder"
                        style={{
                          display: booking.clientProfileImage ? "none" : "flex",
                        }}
                      >
                        {booking.clientName?.charAt(0).toUpperCase() || "C"}
                      </div>
                    </div>
                    <div className="client-details">
                      <h3 className="client-name">{booking.clientName}</h3>
                      <p className="client-email">{booking.clientEmail}</p>
                    </div>
                  </div>

                  <div className="service-info">
                    <h4 className="service-name">{booking.serviceName}</h4>
                    <div className="service-price">
                      ₹{booking.servicePrice?.toLocaleString()}
                    </div>
                  </div>

                  <div className="booking-meta">
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>
                        {new Date(booking.requestDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-clock"></i>
                      <span>
                        {new Date(booking.requestDate).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {booking.status === "pending" && (
                  <div className="booking-actions">
                    <button
                      className="btn btn-accept"
                      onClick={() =>
                        this.handleBookingAction(booking._id, "accept")
                      }
                    >
                      <i className="fas fa-check"></i> Accept
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={() =>
                        this.handleBookingAction(booking._id, "reject")
                      }
                    >
                      <i className="fas fa-times"></i> Reject
                    </button>
                  </div>
                )}

                {booking.status === "accepted" && (
                  <div className="booking-actions">
                    <button className="btn btn-message">
                      <i className="fas fa-comment"></i> Message Client
                    </button>
                    <button className="btn btn-details">
                      <i className="fas fa-eye"></i> View Details
                    </button>
                  </div>
                )}

                {booking.status === "rejected" && (
                  <div className="booking-actions">
                    <button className="btn btn-details">
                      <i className="fas fa-eye"></i> View Details
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  renderWishlist() {
    const { wishlist } = this.state;

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>My Wishlist</h1>
          <div className="dashboard-actions">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search wishlist..."
                className="search-input"
              />
            </div>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illustration">
              <i className="fas fa-heart"></i>
            </div>
            <h3>Your Wishlist is Empty</h3>
            <p>
              Save your favorite services to your wishlist for easy access
              later!
            </p>
            <Link to="/portfolio-list">
              <button className="btn btn-primary">Discover Services</button>
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map((item, index) => (
              <div className="wishlist-card" key={index}>
                <div className="wishlist-header">
                  <button className="btn-wishlist active">
                    <i className="fas fa-heart"></i>
                  </button>
                  <div className="service-rating">
                    <i className="fas fa-star"></i>
                    <span>{item.rating || 4.5}</span>
                  </div>
                </div>
                <div className="wishlist-body">
                  <h3 className="service-title">{item.service}</h3>
                  <div className="service-provider">
                    <div className="provider-avatar">
                      {item.profileImage ? (
                        <img
                          src={
                            item.profileImage.startsWith("http")
                              ? item.profileImage
                              : `${this.state.baseUrl}${item.profileImage}`
                          }
                          alt={`${item.provider}'s profile`}
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              item.provider
                            )}&background=random&color=fff&size=100`;
                          }}
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          {item.provider.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span>by {item.provider}</span>
                  </div>
                  <div className="service-price">${item.price}</div>
                </div>
                <div className="wishlist-actions">
                  <button className="btn btn-primary">
                    <i className="fas fa-calendar-check"></i> Book Now
                  </button>
                  <button
                    className="btn btn-icon"
                    onClick={() => this.removeFromWishlist(item.id)}
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  renderPortfolioForm() {
    const { portfolioFormData, userData, portfolioValidationErrors } = this.state;

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>Submit Portfolio</h1>
          <button className="btn btn-back" onClick={this.togglePortfolioForm}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>

        <div className="portfolio-form-container">
          <form
            onSubmit={this.handlePortfolioSubmit}
            className="portfolio-form"
          >
            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              <div className="current-profile-preview">
                <label>Current Profile Image</label>
                <div className="profile-preview-container">
                  {userData && userData.profileImage ? (
                    <img
                      src={this.getFullImageUrl(userData.profileImage)}
                      alt="Current Profile"
                      className="current-profile-image"
                    />
                  ) : (
                    <div className="current-profile-placeholder">
                      {this.generateInitials(userData?.name)}
                    </div>
                  )}
                  {/* <span className="preview-note">
                    This will be used for your portfolio
                  </span>  */}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="portfolio-name">Full Name</label>
                  <div className="input-container">
                    <input
                      type="text"
                      id="portfolio-name"
                      name="name"
                      value={portfolioFormData.name}
                      onChange={this.handlePortfolioInputChange}
                      placeholder="Enter your full name"
                      className={portfolioValidationErrors.name ? 'error' : ''}
                      required
                    />
                    {portfolioValidationErrors.name && (
                      <div className="field-tooltip error-tooltip">
                        {portfolioValidationErrors.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="portfolio-email">Email Address</label>
                  <div className="input-container">
                    <input
                      type="email"
                      id="portfolio-email"
                      name="email"
                      value={portfolioFormData.email}
                      onChange={this.handlePortfolioInputChange}
                      placeholder="Enter your email"
                      className={portfolioValidationErrors.email ? 'error' : ''}
                      required
                    />
                    {portfolioValidationErrors.email && (
                      <div className="field-tooltip error-tooltip">
                        {portfolioValidationErrors.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="portfolio-profession">Profession</label>
                  <div className="input-container">
                    <input
                      type="text"
                      id="portfolio-profession"
                      name="profession"
                      value={portfolioFormData.profession}
                      onChange={this.handlePortfolioInputChange}
                      placeholder="e.g. Web Developer"
                      className={portfolioValidationErrors.profession ? 'error' : ''}
                      required
                    />
                    {portfolioValidationErrors.profession && (
                      <div className="field-tooltip error-tooltip">
                        {portfolioValidationErrors.profession}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="portfolio-experience">
                    Work Experience (Years)
                  </label>
                  <div className="input-container">
                    <input
                      type="number"
                      id="portfolio-experience"
                      name="workExperience"
                      value={portfolioFormData.workExperience}
                      onChange={this.handlePortfolioInputChange}
                      min="0"
                      placeholder="Years of experience"
                      className={portfolioValidationErrors.workExperience ? 'error' : ''}
                      required
                    />
                    {portfolioValidationErrors.workExperience && (
                      <div className="field-tooltip error-tooltip">
                        {portfolioValidationErrors.workExperience}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Professional Information</h3>

              <div className="form-group">
                <label htmlFor="portfolio-headline">Headline</label>
                <div className="input-container">
                  <input
                    type="text"
                    id="portfolio-headline"
                    name="headline"
                    value={portfolioFormData.headline}
                    onChange={this.handlePortfolioInputChange}
                    placeholder="e.g. Expert Web Developer with 5+ years experience"
                    className={portfolioValidationErrors.headline ? 'error' : ''}
                    required
                  />
                  {portfolioValidationErrors.headline && (
                    <div className="field-tooltip error-tooltip">
                      {portfolioValidationErrors.headline}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="portfolio-about">About Me</label>
                <div className="textarea-container">
                  <textarea
                    id="portfolio-about"
                    name="about"
                    rows="4"
                    value={portfolioFormData.about}
                    onChange={this.handlePortfolioInputChange}
                    placeholder="Share details about your background, skills, and experience"
                    className={portfolioValidationErrors.about ? 'error' : ''}
                    required
                  ></textarea>
                  {portfolioValidationErrors.about && (
                    <div className="field-tooltip error-tooltip">
                      {portfolioValidationErrors.about}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="portfolio-link">Portfolio Website</label>
                <div className="input-container">
                  <input
                    type="url"
                    id="portfolio-link"
                    name="portfolioLink"
                    value={portfolioFormData.portfolioLink}
                    onChange={this.handlePortfolioInputChange}
                    placeholder="https://your-portfolio-website.com"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Service Details</h3>
              <div className="form-group">
                <label htmlFor="service-name">Service Name</label>
                <div className="input-container">
                  <input
                    type="text"
                    id="service-name"
                    name="serviceName"
                    value={portfolioFormData.serviceName}
                    onChange={this.handlePortfolioInputChange}
                    placeholder="e.g. Web Development"
                    className={portfolioValidationErrors.serviceName ? 'error' : ''}
                    required
                  />
                  {portfolioValidationErrors.serviceName && (
                    <div className="field-tooltip error-tooltip">
                      {portfolioValidationErrors.serviceName}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="service-description">Service Description</label>
                <div className="textarea-container">
                  <textarea
                    id="service-description"
                    name="serviceDescription"
                    rows="4"
                    value={portfolioFormData.serviceDescription}
                    onChange={this.handlePortfolioInputChange}
                    placeholder="Describe your service in detail"
                    className={portfolioValidationErrors.serviceDescription ? 'error' : ''}
                    required
                  ></textarea>
                  {portfolioValidationErrors.serviceDescription && (
                    <div className="field-tooltip error-tooltip">
                      {portfolioValidationErrors.serviceDescription}
                    </div>
                  )}
                </div>
              </div>

              <h4 className="subsection-title">Projects / Portfolio</h4>
              <div className="portfolio-grid-container">
                <ProjectsPortfolioSelector
                  value={this.state.portfolioGrid}
                  onChange={(next) => {
                    // Clear validation error when portfolio grid is updated
                    this.setState(prevState => {
                      const updatedErrors = { ...prevState.portfolioValidationErrors };
                      const hadError = updatedErrors.portfolioGrid;
                      delete updatedErrors.portfolioGrid;

                      // Clear timer if it exists
                      if (prevState.tooltipTimer) {
                        clearTimeout(prevState.tooltipTimer);
                      }

                      // Remove form expansion class if all errors are cleared and this field had an error
                      const hasErrors = Object.keys(updatedErrors).length > 0;
                      if (!hasErrors && hadError) {
                        setTimeout(() => {
                          const formContainer = document.querySelector('.portfolio-form-container');
                          if (formContainer) {
                            formContainer.classList.remove('has-validation-errors');
                          }
                        }, 100);
                      }

                      return {
                        portfolioGrid: next,
                        portfolioValidationErrors: updatedErrors,
                        tooltipTimer: null
                      };
                    });
                  }}
                  isPremium={false} // TODO: Connect to actual subscription status
                />
                {portfolioValidationErrors.portfolioGrid && (
                  <div className="field-tooltip error-tooltip">
                    {portfolioValidationErrors.portfolioGrid}
                  </div>
                )}
              </div>

              <h4 className="subsection-title">Catalogue Tags</h4>
              <div className="catalogue-container">
                <Catalogue
                  value={this.state.portfolioFormData.catalogueTags}
                  onChange={(tags) => {
                    // Clear validation error when tags are added
                    this.setState(prevState => {
                      const updatedErrors = { ...prevState.portfolioValidationErrors };
                      const hadError = updatedErrors.catalogueTags;
                      delete updatedErrors.catalogueTags;

                      // Clear timer if it exists
                      if (prevState.tooltipTimer) {
                        clearTimeout(prevState.tooltipTimer);
                      }

                      // Remove form expansion class if all errors are cleared and this field had an error
                      const hasErrors = Object.keys(updatedErrors).length > 0;
                      if (!hasErrors && hadError) {
                        setTimeout(() => {
                          const formContainer = document.querySelector('.portfolio-form-container');
                          if (formContainer) {
                            formContainer.classList.remove('has-validation-errors');
                          }
                        }, 100);
                      }

                      return {
                        portfolioFormData: {
                          ...prevState.portfolioFormData,
                          catalogueTags: tags
                        },
                        portfolioValidationErrors: updatedErrors,
                        tooltipTimer: null
                      };
                    });
                  }}
                  placeholder="e.g. web developer, interior designer, event manager, video editor, SMM"
                  maxTags={10}
                />
                {portfolioValidationErrors.catalogueTags && (
                  <div className="field-tooltip error-tooltip">
                    {portfolioValidationErrors.catalogueTags}
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={this.togglePortfolioForm}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Portfolio
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  renderProjectsPortfolio() {
    const { projects } = this.state;

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1><i className="fas fa-rocket"></i> Projects & Portfolio</h1>
          <div className="dashboard-actions">
            <button className="btn btn-primary" onClick={this.addProject}>
              <i className="fas fa-plus"></i> Add Project
            </button>
          </div>
        </div>

        <div className="projects-container">
          <div className="projects-description">
            <div className="description-header">
              <i className="fas fa-star"></i>
              <h3>Showcase Your Best Work</h3>
            </div>
            <p>
              Create an impressive portfolio that highlights your skills and expertise. 
              Upload high-quality project images, add detailed descriptions, and set competitive prices 
              to attract potential clients and showcase your professional capabilities.
            </p>
            <div className="features-list">
              <div className="feature-item">
                <i className="fas fa-image"></i>
                <span>Upload up to 4 stunning project images</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-link"></i>
                <span>Add GitHub and live demo links</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-tags"></i>
                <span>Highlight technologies and skills used</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-indian-rupee-sign"></i>
                <span>Set competitive project pricing</span>
              </div>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">
                <i className="fas fa-rocket"></i>
              </div>
              <h3>Ready to Showcase Your Work?</h3>
              <p>Start building your impressive portfolio by adding your first project. Let clients see what you're capable of!</p>
              <button className="btn btn-primary btn-large" onClick={this.addProject}>
                <i className="fas fa-plus"></i> Create Your First Project
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project, projectIndex) => (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <div className="project-number">
                      <span className="project-badge">{projectIndex + 1}</span>
                      <h3>Project {projectIndex + 1}</h3>
                    </div>
                    {projects.length > 1 && (
                      <button
                        className="btn-remove-project"
                        onClick={() => this.removeProject(project.id)}
                        title="Remove Project"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>

                  <div className="project-content">
                    {/* Project Details */}
                    <div className="project-details">
                      <div className="form-group">
                        <label htmlFor={`project-title-${project.id}`}>
                          <i className="fas fa-tag"></i> Project Title
                        </label>
                        <input
                          type="text"
                          id={`project-title-${project.id}`}
                          value={project.title}
                          onChange={(e) => this.handleProjectChange(project.id, 'title', e.target.value)}
                          placeholder="Enter an impressive project title"
                          className="project-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`project-description-${project.id}`}>
                          <i className="fas fa-align-left"></i> Description
                        </label>
                        <textarea
                          id={`project-description-${project.id}`}
                          value={project.description}
                          onChange={(e) => this.handleProjectChange(project.id, 'description', e.target.value)}
                          placeholder="Describe your project, its features, and your role in development"
                          rows="4"
                          className="project-textarea"
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`github-link-${project.id}`}>
                            <i className="fab fa-github"></i> GitHub Repository
                          </label>
                          <input
                            type="url"
                            id={`github-link-${project.id}`}
                            value={project.githubLink}
                            onChange={(e) => this.handleProjectChange(project.id, 'githubLink', e.target.value)}
                            placeholder="https://github.com/username/repo"
                            className="project-input"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`live-link-${project.id}`}>
                            <i className="fas fa-external-link-alt"></i> Live Demo
                          </label>
                          <input
                            type="url"
                            id={`live-link-${project.id}`}
                            value={project.liveLink}
                            onChange={(e) => this.handleProjectChange(project.id, 'liveLink', e.target.value)}
                            placeholder="https://your-project.com"
                            className="project-input"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor={`technologies-${project.id}`}>
                          <i className="fas fa-code"></i> Technologies & Skills
                        </label>
                        <input
                          type="text"
                          id={`technologies-${project.id}`}
                          value={project.technologies}
                          onChange={(e) => this.handleProjectChange(project.id, 'technologies', e.target.value)}
                          placeholder="e.g., React, Node.js, MongoDB, AWS, Docker"
                          className="project-input"
                        />
                      </div>
                    </div>

                    {/* Image Upload Section */}
                    <div className="project-images-section">
                      <div className="section-header">
                        <label>
                          <i className="fas fa-images"></i> Project Images (Max 4)
                        </label>
                        <span className="image-count">
                          {project.images.length}/4 images uploaded
                        </span>
                      </div>
                      <div className="image-upload-grid">
                        {[...Array(4)].map((_, imageIndex) => (
                          <div key={imageIndex} className="image-upload-item">
                            {project.images[imageIndex] ? (
                              <div className="uploaded-image">
                                <img
                                  src={project.images[imageIndex]}
                                  alt={`can't load`}
                                  className="project-image"
                                />
                                <div className="image-overlay">
                                  <button
                                    className="remove-image-btn"
                                    onClick={() => this.removeProjectImage(project.id, imageIndex)}
                                    title="Remove Image"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="image-upload-placeholder">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => this.handleProjectImageUpload(project.id, e)}
                                  style={{ display: 'none' }}
                                />
                                <div className="upload-icon">
                                  <i className="fas fa-camera"></i>
                                </div>
                                <span className="upload-text">Add Image</span>
                                <span className="upload-hint">Click to upload</span>
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price Section */}
                    <div className="project-price-section">
                      <div className="price-input-container">
                        <label htmlFor={`project-price-${project.id}`}>
                          <i className="fas fa-indian-rupee-sign"></i> Project Price (₹)
                        </label>
                        <div className="price-input-wrapper">
                          <input
                            type="number"
                            id={`project-price-${project.id}`}
                            value={project.price}
                            onChange={(e) => this.handleProjectChange(project.id, 'price', e.target.value)}
                            placeholder="Enter competitive price"
                            className="price-input"
                          />
                          <span className="price-suffix">₹</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {projects.length > 0 && (
            <div className="projects-actions">
              <button className="btn btn-secondary" onClick={this.addProject}>
                <i className="fas fa-plus"></i> Add Another Project
              </button>
              <button className="btn btn-primary btn-large" onClick={this.handleSaveProjects}>
                <i className="fas fa-save"></i> Save All Projects
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  renderError() {
    return (
      <div className="error-container">
        <div className="error-icon">
          <i className="fas fa-exclamation-circle"></i>
        </div>
        <h2 className="error-title">Session Alert</h2>
        <p className="error-message">{this.state.error}</p>
        <button className="btn btn-primary" onClick={this.handleLogout}>
          Login Again
        </button>
      </div>
    );
  }

  renderSidebarButton() {
    if (this.isAdmin()) {
      return (
        <Link to="/admin-dashboard" className="sidebar-admin-button">
          <i className="fas fa-cog"></i>
          <span>Admin Dashboard</span>
        </Link>
      );
    } else {
      if (this.state.portfolioStatus === "approved") {
        return (
          <button
            className="sidebar-button approved"
            onClick={this.handleViewPortfolio}
          >
            <i className="fas fa-user-tie"></i>
            <span>View My Portfolio</span>
          </button>
        );
      } else if (this.state.portfolioStatus === "pending") {
        return (
          <div className="sidebar-status pending">
            <i className="fas fa-hourglass-half"></i>
            <span>Portfolio Under Review</span>
          </div>
        );
      } else if (this.state.portfolioStatus === "rejected") {
        return (
          <button
            className="sidebar-button rejected"
            onClick={this.togglePortfolioForm}
          >
            <i className="fas fa-redo"></i>
            <span>Resubmit Portfolio</span>
          </button>
        );
      } else {
        return (
          <button
            className="sidebar-button new"
            onClick={this.togglePortfolioForm}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Submit Portfolio</span>
          </button>
        );
      }
    }
  }

  renderMobileToggleButton() {
    return (
      <button
        className="mobile-sidebar-toggle"
        onClick={this.toggleMobileSidebar}
        aria-label="Toggle navigation"
      >
        <i
          className={`fas fa-${
            this.state.showMobileSidebar ? "times" : "bars"
          }`}
        ></i>
      </button>
    );
  }

  renderDashboardContent() {
    const { activeTab, showPortfolioForm } = this.state;

    if (showPortfolioForm) {
      return this.renderPortfolioForm();
    }

    switch (activeTab) {
      case "profile":
        return this.state.isEditing
          ? this.renderEditForm()
          : this.renderUserProfile();
      case "orders":
        return this.renderOrders();
      case "bookings":
        return this.renderBookings();
      case "wishlist":
        return this.renderWishlist();
      case "projects":
        return this.renderProjectsPortfolio();
      default:
        return this.renderUserProfile();
    }
  }

  render() {
    const { isLoading, error, errorType, activeTab, showMobileSidebar } =
      this.state;

    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      );
    }

    if (error && errorType !== "new_user_edit") {
      return (
        <>
          <div className="dashboard-container">{this.renderError()}</div>
        </>
      );
    }

    const userData = this.state.userData;
    const profileImageUrl = userData
      ? this.getFullImageUrl(userData.profileImage)
      : null;

    return (
      <>
        <div className="dashboard-container">
          {!this.state.showPortfolioForm && this.renderMobileToggleButton()}
          {!this.state.showPortfolioForm && (
            <div
              className={`dashboard-sidebar ${
                showMobileSidebar ? "mobile-active" : ""
              }`}
            >
            <div className="sidebar-user">
              <div className="user-avatar">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={userData.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {userData.name
                      ? userData.name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{userData.name}</div>
                <div className="user-voat-id">{userData.voatId}</div>
                <div className={`user-badge ${userData.badge}`}>
                  {userData.badge.charAt(0).toUpperCase() +
                    userData.badge.slice(1)}
                </div>
              </div>
            </div>

            <nav className="sidebar-nav">
              <Link to="/" className="nav-link">
                <div className="nav-item">
                  <i className="fas fa-home nav-icon"></i>
                  <span className="nav-text">Home</span>
                </div>
              </Link>

              <button
                className={`nav-item ${
                  activeTab === "profile" ? "active" : ""
                }`}
                onClick={() => this.handleTabChange("profile")}
              >
                <i className="fas fa-user nav-icon"></i>
                <span className="nav-text">Dashboard</span>
              </button>

              <button
                className={`nav-item ${activeTab === "orders" ? "active" : ""}`}
                onClick={() => this.handleTabChange("orders")}
              >
                <i className="fas fa-clipboard-list nav-icon"></i>
                <span className="nav-text">My Orders</span>
              </button>

              {this.isFreelancer() && (
                <button
                  className={`nav-item ${
                    activeTab === "bookings" ? "active" : ""
                  }`}
                  onClick={() => this.handleTabChange("bookings")}
                >
                  <i className="fas fa-calendar-check nav-icon"></i>
                  <span className="nav-text">Bookings</span>
                </button>
              )}

              <button
                className={`nav-item ${
                  activeTab === "wishlist" ? "active" : ""
                }`}
                onClick={() => this.handleTabChange("wishlist")}
              >
                <i className="fas fa-heart nav-icon"></i>
                <span className="nav-text">Wishlist</span>
              </button>

              {this.isFreelancer() && (
                <button
                  className={`nav-item ${
                    activeTab === "projects" ? "active" : ""
                  }`}
                  onClick={() => this.handleTabChange("projects")}
                >
                  <i className="fas fa-images nav-icon"></i>
                  <span className="nav-text">Projects</span>
                </button>
              )}

              <button className="nav-item" onClick={this.handleLogout}>
                <i className="fas fa-sign-out-alt nav-icon"></i>
                <span className="nav-text">Logout</span>
              </button>
            </nav>
            <div className="sidebar-footer">
              {this.renderSidebarButton()}

              <div className="sidebar-voat-points">
                <div className="points-icon">
                  <i className="fas fa-award"></i>
                </div>
                <div className="points-info">
                  <div className="points-value">{userData.voatPoints || 0}</div>
                  <div className="points-label">VOAT Points</div>
                </div>
              </div>
            </div>
          </div>
          )}

          <div className={`dashboard-content ${this.state.showPortfolioForm ? 'full-width' : ''}`}>
            {error && errorType === "new_user_edit"
              ? this.renderError()
              : this.renderDashboardContent()}
          </div>
        </div>
      </>
    );
  }

  handleSaveProjects = async () => {
    const { projects } = this.state;
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!userData || !userData.id) {
      this.addNotification({
        type: "error",
        message: "Please log in to save your projects."
      });
      return;
    }

    try {
      // Save projects to localStorage for now (can be extended to save to server)
      localStorage.setItem(`user_projects_${userData.id}`, JSON.stringify(projects));
      
      this.addNotification({
        type: "success",
        message: "Projects saved successfully! Your portfolio has been updated."
      });

      // Update the state to mark projects as saved
      this.setState(prevState => ({
        projects: prevState.projects.map(project => ({
          ...project,
          isSaved: true
        }))
      }));

    } catch (error) {
      console.error("Error saving projects:", error);
      this.addNotification({
        type: "error",
        message: "Failed to save projects. Please try again."
      });
    }
  };

  loadSavedProjects = () => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (userData && userData.id) {
      const savedProjects = localStorage.getItem(`user_projects_${userData.id}`);
      if (savedProjects) {
        try {
          const projects = JSON.parse(savedProjects);
          this.setState({ projects });
        } catch (error) {
          console.error("Error loading saved projects:", error);
        }
      }
    }
  };
}

export default UserDashboard;
