import React from 'react';
import './index.css';

class VoatGallery extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      galleryItems: [
        { id: 1, title: "VOAT Network", image: "/images/VOAT Network LOGO.png", description: "Professional networking platform", aspectRatio: 1.2 },
        { id: 2, title: "Creative Stickers", image: "/images/22 stickers black bg.png", description: "Custom sticker designs", aspectRatio: 0.8 },
        { id: 3, title: "Project Showcase", image: "/images/image-2.jpg", description: "Featured project work", aspectRatio: 1.5 },
        { id: 4, title: "Design Portfolio", image: "/images/image-3.jpg", description: "Creative design solutions", aspectRatio: 0.7 },
        { id: 5, title: "Brand Identity", image: "/images/image-4.jpg", description: "Logo and brand design", aspectRatio: 1.1 },
        { id: 6, title: "Digital Artwork", image: "/images/22 stickers black bg.png", description: "Digital art creations", aspectRatio: 1.3 },
        { id: 7, title: "Web Development", image: "/images/VOAT Network LOGO.png", description: "Modern web solutions", aspectRatio: 0.9 },
        { id: 8, title: "Mobile Apps", image: "/images/image-2.jpg", description: "iOS & Android development", aspectRatio: 1.4 },
        { id: 9, title: "UI/UX Design", image: "/images/image-3.jpg", description: "User experience design", aspectRatio: 1.0 },
        { id: 10, title: "Graphic Design", image: "/images/image-4.jpg", description: "Visual communication", aspectRatio: 0.6 },
        { id: 11, title: "Photography", image: "/images/22 stickers black bg.png", description: "Professional photography", aspectRatio: 1.2 },
        { id: 12, title: "Video Editing", image: "/images/VOAT Network LOGO.png", description: "Video production services", aspectRatio: 1.6 },
        { id: 13, title: "Content Writing", image: "/images/image-2.jpg", description: "Engaging content creation", aspectRatio: 0.8 },
        { id: 14, title: "SEO Services", image: "/images/image-3.jpg", description: "Search engine optimization", aspectRatio: 1.1 },
        { id: 15, title: "Social Media", image: "/images/image-4.jpg", description: "Social media management", aspectRatio: 1.3 },
        { id: 16, title: "E-commerce", image: "/images/22 stickers black bg.png", description: "Online store development", aspectRatio: 0.9 },
        { id: 17, title: "Data Analysis", image: "/images/VOAT Network LOGO.png", description: "Business intelligence", aspectRatio: 1.4 },
        { id: 18, title: "Cloud Services", image: "/images/image-2.jpg", description: "Cloud infrastructure", aspectRatio: 0.7 },
        { id: 19, title: "AI Solutions", image: "/images/image-3.jpg", description: "Artificial intelligence", aspectRatio: 1.0 },
        { id: 20, title: "Blockchain", image: "/images/image-4.jpg", description: "Blockchain development", aspectRatio: 1.5 },
        { id: 21, title: "Cybersecurity", image: "/images/22 stickers black bg.png", description: "Security consulting", aspectRatio: 0.8 },
        { id: 22, title: "DevOps", image: "/images/VOAT Network LOGO.png", description: "Development operations", aspectRatio: 1.2 },
        { id: 23, title: "Game Development", image: "/images/image-2.jpg", description: "Mobile & web games", aspectRatio: 1.1 },
        { id: 24, title: "AR/VR", image: "/images/image-3.jpg", description: "Immersive experiences", aspectRatio: 0.9 }
      ],
      visibleItems: [],
      isVisible: false,
      activeFilter: 'all',
      loadedImages: {}
    };
    this.observer = null;
    this.galleryRef = React.createRef();
  }

  componentDidMount() {
    this.setupIntersectionObserver();
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    if (this.observer) {
      this.observer.disconnect();
    }
    window.removeEventListener('resize', this.handleResize);
  }

  setupIntersectionObserver = () => {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.state.isVisible) {
            this.setState({ isVisible: true });
            this.animateItems();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (this.galleryRef.current) {
      this.observer.observe(this.galleryRef.current);
    }
  };

  animateItems = () => {
    const { galleryItems } = this.state;
    galleryItems.forEach((item, index) => {
      setTimeout(() => {
        this.setState(prevState => ({
          visibleItems: [...prevState.visibleItems, item.id]
        }));
      }, index * 100); // Reduced delay for faster animation
    });
  };

  handleFilterClick = (filter) => {
    this.setState({ activeFilter: filter });
  };

  handleItemClick = (item) => {
    // You can add modal opening logic here
    console.log('Item clicked:', item);
    // Example: this.openModal(item);
  };

  handleSignUp = () => {
    // Better navigation handling
    if (window.location.pathname !== '/signup') {
      window.location.href = '/signup';
    }
  };

  handleResize = () => {
    // Debounce resize events to avoid excessive re-renders
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.forceUpdate(); // Force re-render to recalculate heights
    }, 150);
  };

  handleImageLoad = (itemId, event) => {
    const img = event.target;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    
    this.setState(prevState => ({
      loadedImages: {
        ...prevState.loadedImages,
        [itemId]: {
          aspectRatio: aspectRatio,
          loaded: true
        }
      }
    }));
  };

  calculateDynamicHeight = (item) => {
    const { loadedImages } = this.state;
    
    // Responsive base width calculation
    const getBaseWidth = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth <= 480) return 360; // Mobile portrait
      if (screenWidth <= 768) return 340; // Mobile landscape
      if (screenWidth <= 1200) return 320; // Tablet
      return 280; // Desktop
    };
    
    const baseWidth = getBaseWidth();
    
    if (loadedImages[item.id] && loadedImages[item.id].loaded) {
      // Use actual loaded image aspect ratio
      const aspectRatio = loadedImages[item.id].aspectRatio;
      return Math.round(baseWidth / aspectRatio);
    } else {
      // Use predefined aspect ratio as fallback
      return Math.round(baseWidth / item.aspectRatio);
    }
  };

  render() {
    const { galleryItems, visibleItems, activeFilter } = this.state;

    // Filter items based on active filter (by aspect ratio categories)
    const filteredItems = activeFilter === 'all' 
      ? galleryItems 
      : galleryItems.filter(item => {
          if (activeFilter === 'tall') return item.aspectRatio <= 0.8; // Portrait/tall images
          if (activeFilter === 'medium') return item.aspectRatio > 0.8 && item.aspectRatio <= 1.2; // Square-ish images
          if (activeFilter === 'short') return item.aspectRatio > 1.2; // Landscape/wide images
          return true;
        });

    return (
      <section className="voat-gallery-section" ref={this.galleryRef}>
        <div className="voat-gallery-container">
          {/* Gallery Header */}
          <div className="voat-gallery-header">
            <h2 className="voat-gallery-title">VOAT Gallery</h2>
            <p className="voat-gallery-subtitle">
              Discover amazing work from our talented community of freelancers
            </p>
          </div>

          {/* Filter Buttons - Added back with better functionality */}
          <div className="voat-gallery-filters">
            <button 
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => this.handleFilterClick('all')}
            >
              All Work
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'tall' ? 'active' : ''}`}
              onClick={() => this.handleFilterClick('tall')}
            >
              Featured
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'medium' ? 'active' : ''}`}
              onClick={() => this.handleFilterClick('medium')}
            >
              Designs
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'short' ? 'active' : ''}`}
              onClick={() => this.handleFilterClick('short')}
            >
              Projects
            </button>
          </div>

          {/* Gallery Grid - Improved Masonry Layout */}
          <div className="voat-gallery-grid">
            {filteredItems.map((item, index) => {
              const dynamicHeight = this.calculateDynamicHeight(item);
              return (
                <div
                  key={item.id}
                  className={`voat-gallery-item ${visibleItems.includes(item.id) ? 'visible' : ''}`}
                  style={{ 
                    height: `${dynamicHeight}px`,
                    animationDelay: `${index * 0.1}s`,
                    transitionDelay: `${index * 0.1}s`
                  }}
                  onClick={() => this.handleItemClick(item)}
                >
                  <div className="gallery-item-image">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      onLoad={(e) => this.handleImageLoad(item.id, e)}
                      onError={(e) => {
                        e.target.src = '/images/placeholder.jpg'; // Fallback image
                        e.target.alt = 'Image not available';
                      }}
                    />
                    <div className="gallery-item-overlay">
                      <h3 className="gallery-item-title">{item.title}</h3>
                      <p className="gallery-item-description">{item.description}</p>
                      <button className="gallery-item-btn">View Project</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action */}
          <div className="voat-gallery-cta">
            <p>Ready to showcase your work?</p>
            <button className="voat-gallery-cta-btn" onClick={this.handleSignUp}>
              Join VOAT Network
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </section>
    );
  }
}

export default VoatGallery;