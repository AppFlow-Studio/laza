import React from 'react';

interface LazaWelcomeEmailProps {
    customerData: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

const LazaWelcomeEmail: React.FC<LazaWelcomeEmailProps> = ({ customerData }) => {
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
                    top: '20px',
                    right: '20px',
                    width: '100px',
                    height: '100px',
                    backgroundImage: 'url(/desserts/triplechocolatekunafa.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '50%',
                    opacity: '0.2'
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    width: '80px',
                    height: '80px',
                    backgroundImage: 'url(/desserts/oreocrepe.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '50%',
                    opacity: '0.2'
                }}></div>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '120px',
                    height: '120px',
                    backgroundImage: 'url(/drinks/ferroshake.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '50%',
                    opacity: '0.15'
                }}></div>

                <img
                    src="/lazabluelogo.png"
                    alt="Laza Dessert Cafe"
                    style={{
                        width: '140px',
                        height: 'auto',
                        marginBottom: '20px',
                        position: 'relative',
                        zIndex: '2'
                    }}
                />
                <h1 style={{
                    color: 'white',
                    margin: '0',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    position: 'relative',
                    zIndex: '2'
                }}>
                    Welcome to Laza! 🎉
                </h1>
                <p style={{
                    color: 'rgba(255,255,255,0.95)',
                    margin: '15px 0 0 0',
                    fontSize: '18px',
                    position: 'relative',
                    zIndex: '2'
                }}>
                    Your sweet journey begins here
                </p>
            </div>

            {/* Main Content */}
            <div style={{
                backgroundColor: 'white',
                padding: '40px 30px',
                borderRadius: '0 0 20px 20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                {/* Welcome Message */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2 style={{
                        color: '#1B3A6B',
                        margin: '0 0 20px 0',
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        Hello {customerData.firstName}! 👋
                    </h2>
                    <p style={{
                        color: '#2C4B7E',
                        margin: '0 0 15px 0',
                        fontSize: '16px',
                        lineHeight: '1.6'
                    }}>
                        Welcome to the Laza family! We're thrilled to have you join our community of dessert lovers.
                    </p>
                    <p style={{
                        color: '#2C4B7E',
                        margin: '0',
                        fontSize: '16px',
                        lineHeight: '1.6'
                    }}>
                        Get ready to indulge in the most delicious Middle Eastern desserts and refreshing drinks!
                    </p>
                </div>

                {/* Featured Items Grid */}
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{
                        color: '#1B3A6B',
                        margin: '0 0 25px 0',
                        fontSize: '22px',
                        textAlign: 'center',
                        borderBottom: '2px solid #2C4B7E',
                        paddingBottom: '10px'
                    }}>
                        Our Signature Delights
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '20px'
                    }}>
                        <div style={{
                            textAlign: 'center',
                            padding: '15px',
                            backgroundColor: 'rgba(44, 75, 126, 0.05)',
                            borderRadius: '15px',
                            border: '1px solid rgba(44, 75, 126, 0.1)'
                        }}>
                            <img
                                src="/desserts/kunafa.jpg"
                                alt="Kunafa"
                                style={{
                                    width: '80px',
                                    height: '80px',
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
                                Classic Kunafa
                            </h4>
                            <p style={{
                                color: '#2C4B7E',
                                margin: '0',
                                fontSize: '14px'
                            }}>
                                Our signature dessert
                            </p>
                        </div>
                        <div style={{
                            textAlign: 'center',
                            padding: '15px',
                            backgroundColor: 'rgba(44, 75, 126, 0.05)',
                            borderRadius: '15px',
                            border: '1px solid rgba(44, 75, 126, 0.1)'
                        }}>
                            <img
                                src="/desserts/crepe.jpg"
                                alt="Crepes"
                                style={{
                                    width: '80px',
                                    height: '80px',
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
                                Sweet Crepes
                            </h4>
                            <p style={{
                                color: '#2C4B7E',
                                margin: '0',
                                fontSize: '14px'
                            }}>
                                Made fresh daily
                            </p>
                        </div>
                        <div style={{
                            textAlign: 'center',
                            padding: '15px',
                            backgroundColor: 'rgba(44, 75, 126, 0.05)',
                            borderRadius: '15px',
                            border: '1px solid rgba(44, 75, 126, 0.1)'
                        }}>
                            <img
                                src="/drinks/ferroshake.jpg"
                                alt="Ferro Shake"
                                style={{
                                    width: '80px',
                                    height: '80px',
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
                                Ferro Shake
                            </h4>
                            <p style={{
                                color: '#2C4B7E',
                                margin: '0',
                                fontSize: '14px'
                            }}>
                                Refreshing & delicious
                            </p>
                        </div>
                    </div>
                </div>

                {/* Special Offer */}
                <div style={{
                    backgroundColor: 'rgba(44, 75, 126, 0.1)',
                    padding: '25px',
                    borderRadius: '15px',
                    border: '2px solid #2C4B7E',
                    textAlign: 'center',
                    marginBottom: '40px'
                }}>
                    <h3 style={{
                        color: '#1B3A6B',
                        margin: '0 0 15px 0',
                        fontSize: '20px',
                        fontWeight: 'bold'
                    }}>
                        🎁 Special Welcome Offer
                    </h3>
                    <p style={{
                        color: '#2C4B7E',
                        margin: '0 0 15px 0',
                        fontSize: '16px'
                    }}>
                        As a new member of the Laza family, enjoy
                    </p>
                    <div style={{
                        backgroundColor: '#2C4B7E',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '10px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        margin: '0 auto',
                        maxWidth: '300px'
                    }}>
                        15% OFF Your First Order!
                    </div>
                    <p style={{
                        color: '#666',
                        margin: '15px 0 0 0',
                        fontSize: '14px'
                    }}>
                        Use code: <strong>WELCOME15</strong> at checkout
                    </p>
                </div>

                {/* Call to Action */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <a href="/" style={{
                        display: 'inline-block',
                        backgroundColor: '#2C4B7E',
                        color: 'white',
                        padding: '15px 30px',
                        borderRadius: '25px',
                        textDecoration: 'none',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 15px rgba(44, 75, 126, 0.3)',
                        transition: 'all 0.3s ease'
                    }}>
                        Start Your Sweet Journey →
                    </a>
                </div>

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    backgroundColor: 'rgba(44, 75, 126, 0.05)',
                    borderRadius: '15px'
                }}>
                    <p style={{
                        color: '#1B3A6B',
                        margin: '0 0 15px 0',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}>
                        Follow us for daily dessert inspiration! 🍰
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
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer'
                                }}
                            />
                        </a>
                        <img
                            src="/tiktok.png"
                            alt="TikTok"
                            style={{
                                width: '40px',
                                height: '40px',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                    <p style={{
                        color: '#666',
                        margin: '0',
                        fontSize: '12px'
                    }}>
                        Thank you for choosing Laza Dessert Cafe! 🌟
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LazaWelcomeEmail; 