document.addEventListener('DOMContentLoaded', function() {
    // Get all form elements
    const classSelect = document.getElementById('class-select');
    const englishSelect = document.getElementById('english-select');
    const scientificSelect = document.getElementById('scientific-select');
    const soundSelect = document.getElementById('sound-select');
    const form = document.getElementById('animal-emotion-form');
    const resultDisplay = document.getElementById('result-display');
    const submitBtn = document.getElementById('submit-btn');

    // State tracking
    let currentAnimals = [];
    let selectedEnglishName = '';
    let selectedScientificName = '';

    // Event listener for class selection
    classSelect.addEventListener('change', function() {
        const selectedClass = this.value;
        
        if (selectedClass) {
            enableAnimalFields();
            
            fetch(`/get_animals_by_class/${encodeURIComponent(selectedClass)}`)
                .then(response => response.json())
                .then(data => {
                    currentAnimals = data.animals || [];
                    populateAnimalDropdowns();
                })
                .catch(error => {
                    console.error('Error fetching animals:', error);
                    showResult('Error loading animals for this class.', 'error');
                });
        } else {
            disableAnimalFields();
            currentAnimals = [];
        }
        
        resetAnimalFields();
        resetSoundsAndValidation();
    });

    // Select change handlers
    englishSelect.addEventListener('change', function() {
        if (this.value) {
            selectedEnglishName = this.value;
            const animal = currentAnimals.find(a => a.english_name === this.value);
            if (animal) {
                selectedScientificName = animal.scientific_name;
                scientificSelect.value = animal.scientific_name;
                loadSounds();
            }
        } else {
            selectedEnglishName = '';
            resetSoundsAndValidation();
        }
    });

    scientificSelect.addEventListener('change', function() {
        if (this.value) {
            selectedScientificName = this.value;
            const animal = currentAnimals.find(a => a.scientific_name === this.value);
            if (animal) {
                selectedEnglishName = animal.english_name;
                englishSelect.value = animal.english_name;
                loadSounds();
            }
        } else {
            selectedScientificName = '';
            resetSoundsAndValidation();
        }
    });

    // Sound selection listener
    soundSelect.addEventListener('change', function() {
        checkFormValidation();
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!isFormValid()) {
            showResult('Please fill all required fields correctly.', 'error');
            return;
        }

        showResult('Loading...', 'loading');
        
        const requestData = {
            class: classSelect.value,
            english_name: selectedEnglishName,
            scientific_name: selectedScientificName,
            sound: soundSelect.value
        };

        fetch('/get_result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.result && typeof data.result === 'object') {
                const resultHtml = `
                    <div class="result-content">
                        <h3 style="margin-top: 0; color: #4a5568;">🔍 Analysis Results</h3>
                        <div class="result-item">
                            <div class="result-icon">🦁</div>
                            <div class="result-text">
                                <div class="result-label">Animal:</div>
                                <div class="result-value">${selectedEnglishName} (${selectedScientificName})</div>
                            </div>
                        </div>
                        <div class="result-item">
                            <div class="result-icon">🔊</div>
                            <div class="result-text">
                                <div class="result-label">Sound:</div>
                                <div class="result-value">${soundSelect.value}</div>
                            </div>
                        </div>
                        <div class="result-item">
                            <div class="result-icon">😊</div>
                            <div class="result-text">
                                <div class="result-label">Emotion:</div>
                                <div class="result-value">${data.result.emotion_label}</div>
                            </div>
                        </div>
                        <div class="result-item">
                            <div class="result-icon">📝</div>
                            <div class="result-text">
                                <div class="result-label">Context / Trigger:</div>
                                <div class="result-value">${data.result.context_trigger}</div>
                            </div>
                        </div>
                    </div>
                `;
                showResult(resultHtml, 'success');
            } else {
                showResult('No information found for this combination.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showResult('Sorry, there was an error processing your request.', 'error');
        });
    });

    // Helper functions
    function enableAnimalFields() {
        englishSelect.disabled = false;
        scientificSelect.disabled = false;
    }

    function disableAnimalFields() {
        englishSelect.disabled = true;
        scientificSelect.disabled = true;
    }

    function populateAnimalDropdowns() {
        englishSelect.innerHTML = '<option value="">-- Select English Name --</option>';
        scientificSelect.innerHTML = '<option value="">-- Select Scientific Name --</option>';
        currentAnimals.forEach(animal => {
            const englishOption = document.createElement('option');
            englishOption.value = animal.english_name;
            englishOption.textContent = animal.english_name;
            englishSelect.appendChild(englishOption);

            const scientificOption = document.createElement('option');
            scientificOption.value = animal.scientific_name;
            scientificOption.textContent = animal.scientific_name;
            scientificSelect.appendChild(scientificOption);
        });
    }

    function resetAnimalFields() {
        englishSelect.value = '';
        scientificSelect.value = '';
        selectedEnglishName = '';
        selectedScientificName = '';
    }

    function resetSoundsAndValidation() {
        soundSelect.innerHTML = '<option value="">Select animal first</option>';
        soundSelect.disabled = true;
        checkFormValidation();
        hideResult();
    }

    function validateAnimalName(name, type) {
        const requestData = {
            name: name,
            class: classSelect.value
        };

        fetch('/get_animal_by_name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.animal) {
                selectedEnglishName = data.animal.english_name;
                selectedScientificName = data.animal.scientific_name;
                
                if (type === 'english') {
                    scientificInput.value = data.animal.scientific_name;
                } else {
                    englishInput.value = data.animal.english_name;
                }
                
                loadSounds();
            } else {
                resetSoundsAndValidation();
            }
        })
        .catch(error => {
            console.error('Error validating animal name:', error);
            resetSoundsAndValidation();
        });
    }

    function loadSounds() {
        if (selectedEnglishName && selectedScientificName && classSelect.value) {
            soundSelect.innerHTML = '<option value="">Loading sounds...</option>';
            
            const requestData = {
                english_name: selectedEnglishName,
                scientific_name: selectedScientificName,
                class: classSelect.value
            };

            fetch('/get_sounds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                soundSelect.innerHTML = '<option value="">-- Select Sound --</option>';
                if (data.sounds && data.sounds.length > 0) {
                    data.sounds.forEach(sound => {
                        const option = document.createElement('option');
                        option.value = sound;
                        option.textContent = sound;
                        soundSelect.appendChild(option);
                    });
                    soundSelect.disabled = false;
                } else {
                    soundSelect.innerHTML = '<option value="">No sounds available</option>';
                    soundSelect.disabled = true;
                }
                checkFormValidation();
            })
            .catch(error => {
                console.error('Error loading sounds:', error);
                soundSelect.innerHTML = '<option value="">Error loading sounds</option>';
                soundSelect.disabled = true;
                checkFormValidation();
            });
        }
    }

    function isFormValid() {
        return classSelect.value && 
               (selectedEnglishName || selectedScientificName) && 
               soundSelect.value && 
               !soundSelect.disabled;
    }

    function checkFormValidation() {
        submitBtn.disabled = !isFormValid();
    }

    function showResult(content, type) {
        resultDisplay.innerHTML = content;
        resultDisplay.className = type === 'error' ? 'error' : (type === 'loading' ? 'loading' : '');
        resultDisplay.classList.add('result-visible');
    }

    function hideResult() {
        resultDisplay.classList.remove('result-visible');
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize form validation
    checkFormValidation();
});document.addEventListener('DOMContentLoaded', function() {
    const animalSelect = document.getElementById('animal-select');
    const soundSelect = document.getElementById('sound-select');
    const form = document.getElementById('animal-sound-form');
    const resultDisplay = document.getElementById('result-display');

    // Event listener for animal dropdown change
    animalSelect.addEventListener('change', function() {
        const selectedAnimal = this.value;
        
        if (selectedAnimal) {
            // Clear and disable sound dropdown while loading
            soundSelect.innerHTML = '<option value="">Loading sounds...</option>';
            soundSelect.disabled = true;
            
            // Fetch sounds for the selected animal
            fetch(`/get_sounds/${encodeURIComponent(selectedAnimal)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    // Clear the sound dropdown
                    soundSelect.innerHTML = '<option value="">-- Select a Sound --</option>';
                    
                    // Populate with new sounds
                    if (data.sounds && data.sounds.length > 0) {
                        data.sounds.forEach(sound => {
                            const option = document.createElement('option');
                            option.value = sound;
                            option.textContent = sound;
                            soundSelect.appendChild(option);
                        });
                        soundSelect.disabled = false;
                    } else {
                        soundSelect.innerHTML = '<option value="">No sounds available</option>';
                        soundSelect.disabled = true;
                    }
                })
                .catch(error => {
                    console.error('Error fetching sounds:', error);
                    soundSelect.innerHTML = '<option value="">Error loading sounds</option>';
                    soundSelect.disabled = true;
                });
        } else {
            // Reset sound dropdown if no animal is selected
            soundSelect.innerHTML = '<option value="">Select an animal first</option>';
            soundSelect.disabled = true;
        }
        
        // Hide previous results
        resultDisplay.classList.remove('result-visible');
    });

    // Event listener for form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent page reload
        
        const selectedAnimal = animalSelect.value;
        const selectedSound = soundSelect.value;
        
        // Validate selections
        if (!selectedAnimal || !selectedSound) {
            showResult('Please select both an animal and a sound.', 'error');
            return;
        }
        
        // Show loading message
        showResult('Loading...', 'loading');
        
        // Prepare data for POST request
        const requestData = {
            animal: selectedAnimal,
            sound: selectedSound
        };
        
        // Make POST request to get the "Call For" information
        fetch('/get_call_for', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.call_for) {
                const resultText = `🔍 <strong>${selectedAnimal}</strong> make a <strong>"${selectedSound}"</strong> sound for: <br><br>📢 ${data.call_for}`;
                showResult(resultText, 'success');
            } else {
                showResult('No information found for this combination.', 'error');
            }
        })
        .catch(error => {
            console.error('Error getting call for information:', error);
            showResult('Sorry, there was an error processing your request. Please try again.', 'error');
        });
    });

    // Helper function to display results
    function showResult(message, type) {
        resultDisplay.innerHTML = message;
        resultDisplay.className = type === 'error' ? 'error' : (type === 'loading' ? 'loading' : '');
        resultDisplay.classList.add('result-visible');
    }
});