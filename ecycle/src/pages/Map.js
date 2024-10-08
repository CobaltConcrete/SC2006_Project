import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const Map = () => {
    const { type } = useParams();
    const [userLocation, setUserLocation] = useState(null);
    const [manualLocation, setManualLocation] = useState(null);
    const [locations, setLocations] = useState([]);
    const [manualAddress, setManualAddress] = useState('');
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [error, setError] = useState('');
    const [transportMode, setTransportMode] = useState(window.google.maps.TravelMode.DRIVING); // Default to DRIVING


    useEffect(() => {
        if (useCurrentLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    loadMap(latitude, longitude);
                },
                (error) => {
                    console.error("Error obtaining location", error);
                    setError('Failed to retrieve your current location');
                }
            );
        }
    }, [useCurrentLocation]);

    const loadMap = (lat, lng) => {
        const map = new window.google.maps.Map(document.getElementById('map'), {
            center: { lat, lng },
            zoom: 13,
        });

        new window.google.maps.Marker({
            position: { lat, lng },
            map,
            title: "You are here!",
        });

        // Fetch nearby locations after the map is loaded
        fetchNearbyLocations(lat, lng);
    };

    const fetchNearbyLocations = async (lat, lng) => {
        try {
            const url = type === 'repair' 
                ? 'http://localhost:5000/nearby-repair-locations' 
                : 'http://localhost:5000/nearby-dispose-locations';

            const response = await axios.post(url, {
                lat,
                lon: lng,
            });
            setLocations(response.data.slice(0, 5));
            addMarkersToMap(response.data.slice(0, 5), { lat, lng });
        } catch (err) {
            setError('Failed to fetch nearby locations');
        }
    };

    const addMarkersToMap = (locations, center) => {
        const map = new window.google.maps.Map(document.getElementById('map'), {
            center: center,
            zoom: 13,
        });

        const userMarker = new window.google.maps.Marker({
            map,
            position: center,
            title: "You are here!",
            clickable: true
        });

        const infoWindow = new window.google.maps.InfoWindow();

        // Create a DirectionsService and DirectionsRenderer
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);

        locations.forEach((loc) => {
            const marker = new window.google.maps.Marker({
                map,
                position: { lat: loc.latitude, lng: loc.longitude },
                title: loc.Name,
                icon: new window.google.maps.MarkerImage('http://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_green.png'),
                clickable: true
            });

            // Add click listener to each location marker
            marker.addListener('click', () => {
                // Fetch and display route directions
                directionsService.route(
                    {
                        origin: center,
                        destination: { lat: loc.latitude, lng: loc.longitude },
                        travelMode: transportMode, // Use the selected transport mode here
                        transitOptions: {
                            routingPreference: 'LESS_WALKING'
                        }
                    },
                    (result, status) => {
                        if (status === window.google.maps.DirectionsStatus.OK) {
                            directionsRenderer.setDirections(result);
                        } else {
                            console.error(`Directions request failed due to ${status}`);
                        }
                    }
                );

                // Set and open the info window
                infoWindow.setContent(`
                    <div>
                        <h3 style="color: black;">${loc.Name}</h3>
                        <p style="color: black;">${loc.AddressName}</p>
                        <a href="${loc.Hyperlink}" target="_blank">Visit Website</a>
                    </div>
                `);
                infoWindow.open(map, marker);
            });
        });
    };

    const handleAddressChange = (e) => setManualAddress(e.target.value);

    const handleSearch = () => {
        if (useCurrentLocation && userLocation) {
            fetchNearbyLocations(userLocation.lat, userLocation.lng);
        } else {
            fetchCoordinatesFromAddress(manualAddress);
        }
    };

    const fetchCoordinatesFromAddress = async (address) => {
        try {
            const response = await axios.post('http://localhost:5000/get-coordinates', { address });
            const { lat, lon } = response.data;
            setManualLocation({ lat, lng: lon });
            loadMap(lat, lon); // Center map on manual location
        } catch (err) {
            setError('Failed to fetch coordinates for the given address');
        }
    };

    return (
        <div>
            <h2>Find Nearest {type === 'repair' ? 'Repair' : 'Disposal'} Locations</h2>
            <div>
                <label>
                    <input
                        type="radio"
                        checked={useCurrentLocation}
                        onChange={() => setUseCurrentLocation(true)}
                    />
                    Use Current Location
                </label>
                <label>
                    <input
                        type="radio"
                        checked={!useCurrentLocation}
                        onChange={() => setUseCurrentLocation(false)}
                    />
                    Enter Location Manually
                </label>
            </div>

            {!useCurrentLocation && (
                <div>
                    <input
                        type="text"
                        placeholder="Enter address or postal code"
                        value={manualAddress}
                        onChange={handleAddressChange}
                    />
                </div>
            )}

            <button onClick={handleSearch}>Find Locations</button>

            <div>
                <label htmlFor="transportMode">Select Transport Mode: </label>
                <select
                    id="transportMode"
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                >
                    <option value={window.google.maps.TravelMode.DRIVING}>Driving</option>
                    <option value={window.google.maps.TravelMode.WALKING}>Walking</option>
                    <option value={window.google.maps.TravelMode.BICYCLING}>Bicycling</option>
                    <option value={window.google.maps.TravelMode.TRANSIT}>Transit</option>
                </select>
            </div>

            <div id="map" style={{ height: '400px', width: '100%' }}></div>

            {locations.length > 0 && (
                <div>
                    <h3>Nearby Locations:</h3>
                    <ul>
                        {locations.map((loc, index) => (
                            <li key={index}>
                                <h4>{loc.Name}</h4>
                                <p>{loc.AddressName}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Map;
