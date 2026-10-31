import React from 'react';

interface LazaPromotionalEmailProps {
    promotionData: {
        title: string;
        description: string;
        discount: string;
        validUntil: string;
        code?: string;
        featuredItems: Array<{
            name: string;
            originalPrice: string;
            discountedPrice: string;
            imageSrc: string;
        }>;
    };
}

const LazaPromotionalEmail: React.FC<LazaPromotionalEmailProps> = ({ promotionData }) => {
    return (
        <div style={{
            fontFamily: 'Arial, sans-serif',
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#f8f9fa',
            padding: '20px'
        }}>
            {/* Header with Logo and Background */}
            <div style={{
                background: 'linear-gradient(135deg, #1B3A6B 0%, #2C4B7E 100%)',
                borderRadius: '20px 20px 0 0',
                padding: '40px 30px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative dessert images */}
                <div style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    width: '90px',
                    height: '90px',
                    backgroundImage: 'url(/desserts/pistachiokunafa.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '50%',
                    opacity: '0.25'
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '15px',
                    width: '70px',
                    height: '70px',
                    backgroundImage: 'url(/desserts/lotuskunafa.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '50%',
                    opacity: '0.25'
                }}></div>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '20px',
                    transform: 'translateY(-50%)',
                    width: '60px',
                    height: '60px',
                    backgroundImage: 'url(/drinks/brownieshake.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '50%',
                    opacity: '0.2'
                }}></div>

                <img
                    src="/lazabluelogo.png"
                    alt="Laza Dessert Cafe"
                    style={{
                        width: '130px',
                        height: 'auto',
                        marginBottom: '20px',
                        position: 'relative',
                        zIndex: '2'
                    }}
                />
                <h1 style={{
                    color: 'white',
                    margin: '0',
                    fontSize: '30px',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    position: 'relative',
                    zIndex: '2'
                }}>
                    {promotionData.title}
                </h1>
                <p style={{
                    color: 'rgba(255,255,255,0.95)',
                    margin: '15px 0 0 0',
                    fontSize: '18px',
                    position: 'relative',
                    zIndex: '2'
                }}>
                    {promotionData.description}
                </p>
            </div>

            {/* Main Content */}
            <div style={{
                backgroundColor: 'white',
                padding: '40px 30px',
                borderRadius: '0 0 20px 20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                {/* Promotional Banner */}
                <div style={{
                    backgroundColor: 'rgba(44, 75, 126, 0.1)',
                    padding: '30px',
                    borderRadius: '20px',
                    border: '3px solid #2C4B7E',
                    textAlign: 'center',
                    marginBottom: '40px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        width: '100px',
                        height: '100px',
                        backgroundImage: 'url(/desserts/triplechocolatekunafa.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '50%',
                        opacity: '0.1'
                    }}></div>

                    <h2 style={{
                        color: '#1B3A6B',
                        margin: '0 0 15px 0',
                        fontSize: '28px',
                        fontWeight: 'bold'
                    }}>
                        🎉 {promotionData.discount} OFF! 🎉
                    </h2>
                    <p style={{
                        color: '#2C4B7E',
                        margin: '0 0 20px 0',
                        fontSize: '16px',
                        lineHeight: '1.6'
                    }}>
                        Don't miss out on this amazing offer! Valid until {promotionData.validUntil}
                    </p>
                    {promotionData.code && (
                        <div style={{
                            backgroundColor: '#2C4B7E',
                            color: 'white',
                            padding: '15px 25px',
                            borderRadius: '15px',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            margin: '0 auto',
                            maxWidth: '300px',
                            border: '2px dashed rgba(255,255,255,0.3)'
                        }}>
                            Use Code: {promotionData.code}
                        </div>
                    )}
                </div>

                {/* Featured Items */}
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{
                        color: '#1B3A6B',
                        margin: '0 0 25px 0',
                        fontSize: '24px',
                        textAlign: 'center',
                        borderBottom: '2px solid #2C4B7E',
                        paddingBottom: '10px'
                    }}>
                        Featured Items on Sale
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px'
                    }}>
                        {promotionData.featuredItems.map((item, index) => (
                            <div key={index} style={{
                                backgroundColor: 'rgba(44, 75, 126, 0.05)',
                                borderRadius: '15px',
                                padding: '20px',
                                textAlign: 'center',
                                border: '1px solid rgba(44, 75, 126, 0.1)',
                                position: 'relative'
                            }}>
                                <img
                                    src={item.imageSrc}
                                    alt={item.name}
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        marginBottom: '15px'
                                    }}
                                />
                                <h4 style={{
                                    color: '#1B3A6B',
                                    margin: '0 0 10px 0',
                                    fontSize: '18px',
                                    fontWeight: 'bold'
                                }}>
                                    {item.name}
                                </h4>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '10px'
                                }}>
                                    <span style={{
                                        color: '#666',
                                        textDecoration: 'line-through',
                                        fontSize: '14px'
                                    }}>
                                        ${item.originalPrice}
                                    </span>
                                    <span style={{
                                        color: '#2C4B7E',
                                        fontWeight: 'bold',
                                        fontSize: '18px'
                                    }}>
                                        ${item.discountedPrice}
                                    </span>
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    backgroundColor: '#2C4B7E',
                                    color: 'white',
                                    padding: '5px 10px',
                                    borderRadius: '15px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    SALE
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Additional Offers */}
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{
                        color: '#1B3A6B',
                        margin: '0 0 20px 0',
                        fontSize: '22px',
                        textAlign: 'center'
                    }}>
                        More Sweet Deals
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px'
                    }}>
                        <div style={{
                            padding: '20px',
                            backgroundColor: 'rgba(44, 75, 126, 0.05)',
                            borderRadius: '15px',
                            border: '1px solid rgba(44, 75, 126, 0.1)',
                            textAlign: 'center'
                        }}>
                            <img
                                src="/desserts/kunafa.jpg"
                                alt="Kunafa"
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    marginBottom: '10px'
                                }}
                            />
                            <h4 style={{
                                color: '#1B3A6B',
                                margin: '0 0 5px 0',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}>
                                Buy 2 Get 1 Free
                            </h4>
                            <p style={{
                                color: '#2C4B7E',
                                margin: '0',
                                fontSize: '14px'
                            }}>
                                On all Kunafa varieties
                            </p>
                        </div>
                        <div style={{
                            padding: '20px',
                            backgroundColor: 'rgba(44, 75, 126, 0.05)',
                            borderRadius: '15px',
                            border: '1px solid rgba(44, 75, 126, 0.1)',
                            textAlign: 'center'
                        }}>
                            <img
                                src="/drinks/ferroshake.jpg"
                                alt="Drinks"
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    marginBottom: '10px'
                                }}
                            />
                            <h4 style={{
                                color: '#1B3A6B',
                                margin: '0 0 5px 0',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}>
                                Happy Hour
                            </h4>
                            <p style={{
                                color: '#2C4B7E',
                                margin: '0',
                                fontSize: '14px'
                            }}>
                                20% off all drinks 2-5 PM
                            </p>
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <a href="/" style={{
                        display: 'inline-block',
                        backgroundColor: '#2C4B7E',
                        color: 'white',
                        padding: '18px 35px',
                        borderRadius: '25px',
                        textDecoration: 'none',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        boxShadow: '0 6px 20px rgba(44, 75, 126, 0.4)',
                        transition: 'all 0.3s ease'
                    }}>
                        Shop Now & Save! →
                    </a>
                </div>

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    padding: '25px',
                    backgroundColor: 'rgba(44, 75, 126, 0.05)',
                    borderRadius: '15px'
                }}>
                    <p style={{
                        color: '#1B3A6B',
                        margin: '0 0 15px 0',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}>
                        Follow us for more sweet deals! 🍰
                    </p>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '15px',
                        marginBottom: '20px'
                    }}>
                        <a href="https://www.instagram.com/lazacafe/?hl=en">
                            <img
                                src="/insta.png"
                                alt="Instagram"
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    cursor: 'pointer'
                                }}
                            />
                        </a>
                        <img
                            src="/tiktok.png"
                            alt="TikTok"
                            style={{
                                width: '45px',
                                height: '45px',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                    <p style={{
                        color: '#666',
                        margin: '0',
                        fontSize: '12px'
                    }}>
                        *Terms and conditions apply. Offer valid until {promotionData.validUntil}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LazaPromotionalEmail; 