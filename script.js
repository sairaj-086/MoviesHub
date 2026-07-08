// ======================================================
// CONSTANTS
// ======================================================

const API_KEY = "b10a19be4b4512bba3975a0ee88aabac";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const PLACEHOLDER_IMAGE =
    "https://via.placeholder.com/500x750?text=No+Image";

// ======================================================
// DOM ELEMENTS
// ======================================================

const logo = document.getElementById("logo");
const searchInput = document.getElementById("movieSearch");
const searchBtn = document.getElementById("search-btn");
const sectionTitle = document.getElementById("sectionTitle");
const favoritesBtn = document.getElementById("favorites-btn");
const homeBtn = document.getElementById("home-btn");

const movieGrid = document.querySelector(".movie-grid");

const loading = document.querySelector(".loading");

const movieModal = document.querySelector(".movie-modal");
const movieContent = document.querySelector(".movie-content");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageNumber = document.getElementById("page-number");

// FIX #1: genreContainer was used but never defined
const genreContainer = document.getElementById("genreContainer");

//============================================================
//============================================================
let currentPage = 1;
let currentCategory = null;
let isFavoritesView = false;
let currentMode = "home";
let currentGenreId = null;
let currentGenreName = "";
let currentSearchQuery = "";

let searchTimeout;
let selectedgenre = null;

// ======================================================
// HELPER FUNCTIONS
// ======================================================

async function fetchData(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Request Failed");
    }

    return await response.json();
}

function getPosterUrl(path) {
    return path
        ? `${IMAGE_URL}${path}`
        : PLACEHOLDER_IMAGE;
}

function getFavorites() {
    return JSON.parse(localStorage.getItem("favorites")) || [];
}

function saveFavorites(favorites) {
    localStorage.setItem(
        "favorites",
        JSON.stringify(favorites)
    );
}

function toggleFavorite(movieId) {

    let favorites = getFavorites();

    if (favorites.includes(movieId)) {
        favorites = favorites.filter(id => id !== movieId);
        saveFavorites(favorites);
        return false;
    }
    favorites.push(movieId);
    saveFavorites(favorites);
    return true;
}

function isFavorite(movieId) {
    return getFavorites().includes(movieId);
}

// ======================================================
// LOADING FUNCTIONS
// ======================================================

function showLoading() {
    loading.classList.add("hidden");
    searchBtn.disabled = true;
    showSkeletonCards();
}

function hideLoading() {
    loading.classList.add("hidden");
    searchBtn.disabled = false;
}

// ======================================================
// API FUNCTIONS
// ======================================================

async function searchMovies(movieName) {

    const url =
        `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(movieName)}&page=${currentPage}`;

    const data = await fetchData(url);
    return data.results;
}

function liveSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(query);
        
    }, 400);
}

async function loadHomeMovies() {

    // Choose a category only once
    if (!currentCategory) {
        currentCategory = getRandomCategory();
    }
    sectionTitle.textContent = currentCategory.title;
    pageNumber.textContent = `Page ${currentPage}`;
    prevBtn.disabled = currentPage === 1;

    const url =
        `${BASE_URL}${currentCategory.endpoint}?api_key=${API_KEY}&page=${currentPage}`;

    const data = await fetchData(url);

    displayMovies(data.results);
}

async function getMovieDetails(movieId) {

    const url =
        `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`;

    return await fetchData(url);
}

async function getMovieTrailer(movieId) {

    const url =
        `${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`;

    const data = await fetchData(url);

    const trailer = data.results.find(video =>
        video.site === "YouTube" &&
        video.type === "Trailer"
    );

    return trailer;
}

async function getFavoriteMovies() {

    const favoriteIds = getFavorites();

    if (favoriteIds.length === 0) {

        movieGrid.innerHTML = `
        <div class="no-results">
        <h2>❤️ No Favorite Movies Yet</h2>
        <p>Add some movies to your favorites.</p>
        </div>`;

        return [];
    }

    const moviePromises = favoriteIds.map(movieId =>
        getMovieDetails(movieId)
    );

    return await Promise.all(moviePromises);

}

async function getGenres() {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`;
    const data = await fetchData(url);
    return data.genres;
}
// ======================================================
// UI FUNCTIONS
// ======================================================
function displayMovies(movies) {

    if (!movies || movies.length === 0) {
        movieGrid.innerHTML = `
            <p class="no-results">
                No movies found.
            </p>
        `;
        return;
    }

    movieGrid.innerHTML = movies.map(movie => {

        const poster = getPosterUrl(movie.poster_path);

        const favoriteText = isFavorite(movie.id)
            ? "🤍 Remove Favorite"
            : "❤️ Favorite";

        const releaseYear = movie.release_date
            ? new Date(movie.release_date).getFullYear()
            : "N/A";

        // FIX (edge case): vote_average / original_language can be missing
        const rating = typeof movie.vote_average === "number"
            ? movie.vote_average.toFixed(1)
            : "N/A";

        return `
            <div class="movie-card" data-id="${movie.id}">

                <img src="${poster}" alt="${movie.title}">

                <div class="movie-info">

                    <h3>${movie.title}</h3>

                    <p>⭐ ${rating}</p>

                    <p>📅 ${releaseYear}</p>

                    <button
                        class="favorite-btn"
                        data-id="${movie.id}">
                        ${favoriteText}
                    </button>

                </div>

            </div>
        `;

    }).join("");
}

function openModal() {
    movieModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    movieModal.classList.add("hidden");
    document.body.style.overflow = "auto";
}

function displayMovieDetails(movie) {

    const poster = getPosterUrl(movie.poster_path);

    const language = movie.original_language
        ? movie.original_language.toUpperCase()
        : "N/A";

    movieContent.innerHTML = `

        <button id="closeModal">✖</button>

        <div class="movie-details">

            <img src="${poster}" alt="${movie.title}">

            <div class="movie-text">

                <h2>${movie.title}</h2>

                <p>${movie.overview || "No overview available."}</p>

                <p>
                    <strong>⭐ Rating:</strong>
                    ${typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "N/A"}
                </p>

                <p>
                    <strong>📅 Release:</strong>
                    ${movie.release_date || "N/A"}
                </p>

                <p>
                    <strong>⏱ Runtime:</strong>
                    ${movie.runtime || "N/A"} min
                </p>

                <p>
                    <strong>🌍 Language:</strong>
                    ${language}
                </p>

                <button id="trailerBtn"> ▶Watch Trailer</button>

            </div>

        </div>

    `;

    document
        .getElementById("closeModal")
        .addEventListener("click", closeModal);

    document
    .getElementById("trailerBtn")
    .addEventListener("click", async () => {

        try {

            const trailer = await getMovieTrailer(movie.id);

            if (trailer) {

                const youtubeUrl =
                    `https://www.youtube.com/watch?v=${trailer.key}`;

                window.open(youtubeUrl, "_blank");

            } else {
                alert("Trailer not available.");
            }
        } catch (error) {
            console.error(error);

            alert("Failed to load trailer.");
        }
    });

    openModal();
}

function showSkeletonCards(count = 10) {
    movieGrid.innerHTML = Array.from({ length: count }).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-info">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line btn"></div>
            </div>
        </div>
    `).join("");
}

// ======================================================
// GENRE
// ======================================================
function displayGenres(genres) {
    genreContainer.innerHTML = "";
    genres.forEach(genre => {
        const genreBtn = document.createElement("button");

        genreBtn.textContent = genre.name;
        genreBtn.className = "genre-btn"; // FIX: apply CSS styling from style.css
        genreBtn.dataset.id = genre.id;
        genreBtn.dataset.name = genre.name;

        genreContainer.appendChild(genreBtn);
    });
}

function setActiveGenreButton(genreId) {
    // Highlight whichever genre button is currently selected
    genreContainer
        .querySelectorAll(".genre-btn")
        .forEach(btn => {
            btn.classList.toggle(
                "active",
                String(btn.dataset.id) === String(genreId)
            );
        });
}

function clearActiveGenreButton() {
    genreContainer
        .querySelectorAll(".genre-btn")
        .forEach(btn => btn.classList.remove("active"));
}

async function initGenres() {
    try {
        const genres = await getGenres();
        displayGenres(genres);
    } catch (error) {
        console.error("Failed to load genres:", error);
    }
}

async function getMoviesByGenre(genreId, genreName) {

    currentGenreId = genreId;
    currentGenreName = genreName;

    const url =
        `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=${currentPage}`;

    const data = await fetchData(url);

    pageNumber.textContent = `Page ${currentPage}`;
    prevBtn.disabled = currentPage === 1;

    sectionTitle.textContent = `${genreName} Movies`;

    displayMovies(data.results);
}
// ======================================================
// SEARCH
// ======================================================
async function performSearch(movieName) {

    if (!movieName) return;

    try {
        const movies = await searchMovies(movieName);

        displayMovies(movies);
    }
    catch (error) {
        console.error(error);
    }

    currentMode = "search";
    currentSearchQuery = movieName;
    currentPage = 1;
    pageNumber.textContent = `Page ${currentPage}`;
    prevBtn.disabled = true;
    clearActiveGenreButton();

    showLoading();

    try {

        const movies = await searchMovies(movieName);
        displayMovies(movies);

    } catch (error) {
        console.error(error);

        movieGrid.innerHTML = `
            <p>
                Something went wrong.
            </p>
        `;
    } finally {
        hideLoading();
    }
}
// ======================================================
// INITIALIZATION
// ======================================================
async function init() {
    showLoading();

    try {
        await loadHomeMovies();
        await initGenres();
    } catch (error) {
        console.error(error);

        movieGrid.innerHTML = `
            <p>
                Failed to load movies.
            </p>
        `;

    } finally {
        hideLoading();
    }
}
init();
//-------------------------------------------------
// random category
//-------------------------------------------------
function getRandomCategory() {
    const categories = [
        {
            title: "🔥 Popular Movies",
            endpoint: "/movie/popular"
        },
        {
            title: "⭐ Top Rated Movies",
            endpoint: "/movie/top_rated"
        },
        {
            title: "🎬 Now Playing Movies",
            endpoint: "/movie/now_playing"
        },
        {
            title: "📅 Upcoming Movies",
            endpoint: "/movie/upcoming"
        }

    ];

    const randomIndex = Math.floor(Math.random() * categories.length);
    return categories[randomIndex];
}
// ======================================================
// EVENT LISTENERS
// ======================================================
searchBtn.addEventListener("click", () => {
    performSearch(searchInput.value.trim());

});
searchInput.addEventListener("input", () => {

    const query = searchInput.value.trim();

    if (query.length < 2) {
        loadHomeMovies();
        return;
    }
    liveSearch(query);

});

nextBtn.addEventListener("click", async () => {

    currentPage++;
    showLoading();

    try {
        if (currentMode === "home") {
            await loadHomeMovies();
        }
        if (currentMode === "genre") {
            await getMoviesByGenre(currentGenreId, currentGenreName);
        }
        if (currentMode === "search") {
            // FIX #6: actually pass the stored query and render the results
            const movies = await searchMovies(currentSearchQuery);
            displayMovies(movies);
        }
        pageNumber.textContent = `Page ${currentPage}`;
        prevBtn.disabled = currentPage === 1;
    } catch (error) {
        console.error(error);
    } finally {
        hideLoading();
    }

});

prevBtn.addEventListener("click", async () => {
    if (currentPage === 1) return;
    currentPage--;
    showLoading();
    try {
        // FIX #7: respect currentMode instead of always loading home movies
        if (currentMode === "home") {
            await loadHomeMovies();
        }
        if (currentMode === "genre") {
            await getMoviesByGenre(currentGenreId, currentGenreName);
        }
        if (currentMode === "search") {
            const movies = await searchMovies(currentSearchQuery);
            displayMovies(movies);
        }
        pageNumber.textContent = `Page ${currentPage}`;
        prevBtn.disabled = currentPage === 1;
    } catch (error) {

        console.error(error);

    } finally {

        hideLoading();

    }

});

movieGrid.addEventListener("click", async event => {

// -----------------------------
// Favorite Button
// -----------------------------

const favoriteBtn = event.target.closest(".favorite-btn");

if (favoriteBtn) {

    const movieId = Number(favoriteBtn.dataset.id);
    const isFav = toggleFavorite(movieId);

    favoriteBtn.textContent = isFav
        ? "🤍 Remove Favorite"
        : "❤️ Favorite";
        return;
    }

// -----------------------------
// Movie Card
// -----------------------------

const movieCard = event.target.closest(".movie-card");

if (!movieCard) return;

const movieId = Number(movieCard.dataset.id);

try {

    const movie = await getMovieDetails(movieId);
    displayMovieDetails(movie);
    } catch (error) {
        console.error(error);
    }
});

movieModal.addEventListener("click", event => {
    if (event.target === movieModal) {

        closeModal();
    }
});

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        closeModal();
    }
});

favoritesBtn.addEventListener("click", async () => {

    showLoading();
    clearActiveGenreButton();

    try {
        const movies = await getFavoriteMovies();
        if (movies.length > 0) {

            sectionTitle.textContent = "❤️ My Favorite Movies";

            document.querySelector(".pagination").classList.add("hidden");
            displayMovies(movies);
        }

        favoritesBtn.classList.add("hidden");
        homeBtn.classList.remove("hidden");

    } catch (error) {
        console.error(error);
    } finally {
        hideLoading();
    }
});

homeBtn.addEventListener("click", async () => {
    showLoading();
    try {
        currentCategory = null;
        currentPage = 1;
        currentMode = "home"; // FIX #5: reset mode when returning home
        clearActiveGenreButton();

        document.querySelector(".pagination").classList.remove("hidden");

        await loadHomeMovies();

        favoritesBtn.classList.remove("hidden");
        homeBtn.classList.add("hidden");

    } catch (error) {
        console.error(error);
    } finally {
        hideLoading();
    }
});

genreContainer.addEventListener("click", async (event) => {
    const genreBtn = event.target.closest("button");
    if (!genreBtn) return;

    const genreId = genreBtn.dataset.id;
    const genreName = genreBtn.dataset.name;

// TOGGLE: clicking the already-active genre deselects it and goes back home
    const isAlreadyActive = genreBtn.classList.contains("active");

    if (isAlreadyActive) {

        clearActiveGenreButton();

        currentMode = "home";
        currentCategory = null;
        currentPage = 1;

        showLoading();
        try {
            document.querySelector(".pagination").classList.remove("hidden");
            await loadHomeMovies();
        } catch (error) {
            console.error(error);
        } finally {
            hideLoading();
        }

        return;
    }

    currentMode = "genre";
    currentPage = 1;

    setActiveGenreButton(genreId);

    showLoading();
    try {
        await getMoviesByGenre(genreId, genreName);
    } catch (error) {
        console.error(error);
    } finally {
        hideLoading();
    }
});
