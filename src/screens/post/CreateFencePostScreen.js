import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { usePost } from '../../context/PostContext';
import { useAuth } from '../../context/AuthContext';
import { uploadMultipleImages } from '../../utils/imageUpload';
import AppShell from '../../layout/AppShell';

export default function CreateFencePostScreen({ navigation }) {
  const { addPost } = usePost();
  const {
    userProfile,
    fields,
    recordFieldCost,
    recordFieldHarvestBushels,
    fetchFieldHarvestBushelsYearlyTotal,
    recordMarketingRevenue,
  } = useAuth();
  const dimensions = useWindowDimensions();
  const isMobile = dimensions.width < 768;
  const [activity, setActivity] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [formData, setFormData] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedImageFiles, setSelectedImageFiles] = useState([]); // web-only
  const [uploading, setUploading] = useState(false);
  const [postToStateAlso, setPostToStateAlso] = useState(false);

  const activities = [
    { id: 'planting', label: 'Planting' },
    { id: 'spraying', label: 'Spraying' },
    { id: 'fertilizing', label: 'Fertilizing' },
    { id: 'harvesting', label: 'Harvesting' },
    { id: 'tillage', label: 'Tillage' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'land', label: 'Land' },
  ];

  // Form fields based on activity type
  const getFormFields = () => {
    switch (activity) {
      case 'planting':
        return [
          {
            key: 'acres',
            label: 'Acres',
            placeholder: 'e.g., 120',
            keyboardType: 'numeric',
          },
          {
            key: 'implement',
            label: 'Planter/Implement',
            placeholder: 'e.g., John Deere DB60',
          },
          {
            key: 'totalCost',
            label: 'Cost Per Bag ($)',
            placeholder: 'e.g., 250',
            keyboardType: 'numeric',
          },
          {
            key: 'crop',
            label: 'Crop Type',
            type: 'dropdown',
            options: ['Corn', 'Soybeans', 'Wheat'],
          },
          {
            key: 'variety',
            label: 'Seed Variety',
            placeholder: 'e.g., Pioneer 1234',
          },
          {
            key: 'population',
            label: 'Population',
            placeholder: 'e.g., 32,000 seeds/acre',
            keyboardType: 'numeric',
          },
          {
            key: 'rowWidth',
            label: 'Row Width (inches)',
            placeholder: 'e.g., 30',
            keyboardType: 'numeric',
          },
          {
            key: 'depth',
            label: 'Planting Depth (inches)',
            placeholder: 'e.g., 2',
            keyboardType: 'numeric',
          },
          {
            key: 'fertilizer',
            label: 'In-Furrow Fertilizer',
            placeholder: 'e.g., 10-34-0 @ 5 gal/acre',
          },
          {
            key: 'fertilizerCost',
            label: 'In-Furrow Fertilizer Total Cost ($)',
            placeholder: 'e.g., 3000',
            keyboardType: 'numeric',
          },
          {
            key: 'attachments',
            label: 'Planter Attachments',
            placeholder: 'e.g., Row cleaners, closing wheels',
          },
          {
            key: 'fuelUsed',
            label: 'Fuel Used (gallons)',
            placeholder: 'e.g., 45',
            keyboardType: 'numeric',
          },
          {
            key: 'fuelCostPerGallon',
            label: 'Fuel Cost Per Gallon ($)',
            placeholder: 'e.g., 3.50',
            keyboardType: 'numeric',
          },
          {
            key: 'notes',
            label: 'Additional Notes',
            placeholder: 'Any other details...',
            multiline: true,
          },
        ];
      case 'spraying':
        return [
          {
            key: 'acres',
            label: 'Acres',
            placeholder: 'e.g., 120',
            keyboardType: 'numeric',
          },
          {
            key: 'implement',
            label: 'Sprayer/Implement',
            placeholder: 'e.g., John Deere R4045',
          },
          {
            key: 'product',
            label: 'Product Name',
            placeholder: 'e.g., Glyphosate',
          },
          {
            key: 'rate',
            label: 'Application Rate',
            placeholder: 'e.g., 32 oz/acre',
          },
          {
            key: 'tankMix',
            label: 'Tank Mix Partners',
            placeholder: 'Other products mixed',
          },
          {
            key: 'totalCost',
            label: 'Total Cost ($)',
            placeholder: 'e.g., 3000',
            keyboardType: 'numeric',
          },
          {
            key: 'nozzleType',
            label: 'Nozzle Type',
            placeholder: 'e.g., TTI110-03',
          },
          {
            key: 'windSpeed',
            label: 'Wind Speed (mph)',
            placeholder: 'e.g., 5-10',
            keyboardType: 'numeric',
          },
          {
            key: 'temperature',
            label: 'Temperature (°F)',
            placeholder: 'e.g., 68',
            keyboardType: 'numeric',
          },
          {
            key: 'fuelUsed',
            label: 'Fuel Used (gallons)',
            placeholder: 'e.g., 30',
            keyboardType: 'numeric',
          },
          {
            key: 'fuelCostPerGallon',
            label: 'Fuel Cost Per Gallon ($)',
            placeholder: 'e.g., 3.50',
            keyboardType: 'numeric',
          },
          {
            key: 'notes',
            label: 'Additional Notes',
            placeholder: 'Target weeds, conditions, etc.',
            multiline: true,
          },
        ];
      case 'fertilizing':
        return [
          {
            key: 'acres',
            label: 'Acres',
            placeholder: 'e.g., 120',
            keyboardType: 'numeric',
          },
          {
            key: 'implement',
            label: 'Applicator/Implement',
            placeholder: 'e.g., NH3 Bar, Spreader',
          },
          {
            key: 'product',
            label: 'Fertilizer Product',
            placeholder: 'e.g., Anhydrous Ammonia',
          },
          {
            key: 'rate',
            label: 'Application Rate',
            placeholder: 'e.g., 150 lbs N/acre',
          },
          {
            key: 'totalCost',
            label: 'Total Cost ($)',
            placeholder: 'e.g., 8000',
            keyboardType: 'numeric',
          },
          {
            key: 'method',
            label: 'Application Method',
            placeholder: 'e.g., Side-dress, broadcast',
          },
          {
            key: 'depth',
            label: 'Application Depth (inches)',
            placeholder: 'e.g., 6',
            keyboardType: 'numeric',
          },
          {
            key: 'fuelUsed',
            label: 'Fuel Used (gallons)',
            placeholder: 'e.g., 35',
            keyboardType: 'numeric',
          },
          {
            key: 'fuelCostPerGallon',
            label: 'Fuel Cost Per Gallon ($)',
            placeholder: 'e.g., 3.50',
            keyboardType: 'numeric',
          },
          {
            key: 'notes',
            label: 'Additional Notes',
            placeholder: 'Soil conditions, etc.',
            multiline: true,
          },
        ];
      case 'harvesting':
        return [
          {
            key: 'acres',
            label: 'Acres',
            placeholder: 'e.g., 120',
            keyboardType: 'numeric',
          },
          {
            key: 'implement',
            label: 'Combine/Implement',
            placeholder: 'e.g., John Deere S780',
          },
          {
            key: 'crop',
            label: 'Crop',
            type: 'dropdown',
            options: ['Corn', 'Soybeans', 'Wheat'],
          },
          {
            key: 'yield',
            label: 'Estimated Yield',
            placeholder: 'e.g., 180 bu/acre',
            keyboardType: 'numeric',
          },
          {
            key: 'moisture',
            label: 'Moisture %',
            placeholder: 'e.g., 15.5',
            keyboardType: 'numeric',
          },
          {
            key: 'headerType',
            label: 'Header Type',
            placeholder: 'e.g., 8-row corn head',
          },
          {
            key: 'conditions',
            label: 'Field Conditions',
            placeholder: 'e.g., Dry, muddy',
          },
          {
            key: 'fuelUsed',
            label: 'Fuel Used (gallons)',
            placeholder: 'e.g., 60',
            keyboardType: 'numeric',
          },
          {
            key: 'fuelCostPerGallon',
            label: 'Fuel Cost Per Gallon ($)',
            placeholder: 'e.g., 3.50',
            keyboardType: 'numeric',
          },
          {
            key: 'notes',
            label: 'Additional Notes',
            placeholder: 'Quality, issues, etc.',
            multiline: true,
          },
        ];
      case 'tillage':
        return [
          {
            key: 'acres',
            label: 'Acres',
            placeholder: 'e.g., 120',
            keyboardType: 'numeric',
          },
          {
            key: 'implement',
            label: 'Tillage Implement',
            placeholder: 'e.g., Disk, chisel plow',
          },
          {
            key: 'depth',
            label: 'Working Depth (inches)',
            placeholder: 'e.g., 4',
            keyboardType: 'numeric',
          },
          {
            key: 'passes',
            label: 'Number of Passes',
            placeholder: 'e.g., 1',
            keyboardType: 'numeric',
          },
          {
            key: 'conditions',
            label: 'Soil Conditions',
            placeholder: 'e.g., Moist, dry',
          },
          {
            key: 'fuelUsed',
            label: 'Fuel Used (gallons)',
            placeholder: 'e.g., 50',
            keyboardType: 'numeric',
          },
          {
            key: 'fuelCostPerGallon',
            label: 'Fuel Cost Per Gallon ($)',
            placeholder: 'e.g., 3.50',
            keyboardType: 'numeric',
          },
          {
            key: 'notes',
            label: 'Additional Notes',
            placeholder: 'Purpose, results, etc.',
            multiline: true,
          },
        ];
      case 'maintenance':
        return [
          {
            key: 'equipment',
            label: 'Equipment',
            placeholder: 'e.g., John Deere 8R',
          },
          {
            key: 'task',
            label: 'Maintenance Task',
            placeholder: 'e.g., Oil change, tire repair',
          },
          {
            key: 'parts',
            label: 'Parts Used',
            placeholder: 'List parts replaced/used',
          },
          {
            key: 'cost',
            label: 'Estimated Cost',
            placeholder: 'e.g., $500',
            keyboardType: 'numeric',
          },
          {
            key: 'notes',
            label: 'Additional Notes',
            placeholder: 'Details, issues found, etc.',
            multiline: true,
          },
        ];
      case 'marketing':
        return [
          {
            key: 'crop',
            label: 'Crop Type',
            type: 'dropdown',
            options: ['Corn', 'Soybeans', 'Wheat'],
          },
          {
            key: 'bushels',
            label: 'Bushels Sold',
            placeholder: 'e.g., 5000',
            keyboardType: 'numeric',
          },
          {
            key: 'pricePerBushel',
            label: 'Price Per Bushel ($)',
            placeholder: 'e.g., 4.25',
            keyboardType: 'numeric',
          },
          {
            key: 'buyer',
            label: 'Buyer/Elevator',
            placeholder: 'e.g., Local Co-op',
          },
          {
            key: 'contractType',
            label: 'Contract Type',
            placeholder: 'e.g., Cash, Forward Contract',
          },
          {
            key: 'deliveryDate',
            label: 'Delivery Date',
            placeholder: 'e.g., December 15, 2025',
          },
          {
            key: 'notes',
            label: 'Additional Notes',
            placeholder: 'Market conditions, reasoning, etc.',
            multiline: true,
          },
        ];
      case 'land':
        return [
          {
            key: 'landType',
            label: 'Land Type',
            type: 'dropdown',
            options: ['Rent', 'Purchase'],
          },
          {
            key: 'acres',
            label: 'Acres',
            placeholder: 'e.g., 120',
            keyboardType: 'numeric',
          },
          {
            key: 'rentPrice',
            label: 'Rent Price Per Acre ($)',
            placeholder: 'e.g., 250',
            keyboardType: 'numeric',
            condition: 'landType',
            conditionValue: 'Rent',
          },
          {
            key: 'purchasePrice',
            label: 'Purchase Price Per Acre ($)',
            placeholder: 'e.g., 8000',
            keyboardType: 'numeric',
            condition: 'landType',
            conditionValue: 'Purchase',
          },
          {
            key: 'annualMortgage',
            label: 'Annual Mortgage Payment ($)',
            placeholder: 'e.g., 50000',
            keyboardType: 'numeric',
            condition: 'landType',
            conditionValue: 'Purchase',
          },
          {
            key: 'notes',
            label: 'Additional Notes',
            placeholder: 'Terms, details, etc.',
            multiline: true,
          },
        ];
      default:
        return [];
    }
  };

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const DEBUG =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('FP_UPLOAD_DEBUG') === '1';
    const uploadLog = (...args) => {
      if (!DEBUG) return;
      console.log('[upload]', ...args);
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      uploadLog('pick:start', { source: 'web:file-input', accept: 'image/*' });
      const file = await new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () =>
          resolve(input.files && input.files[0] ? input.files[0] : null);
        input.click();
      });

      if (!file) return;

      if (typeof File === 'undefined' || !(file instanceof File)) {
        Alert.alert('Invalid File', 'Please select an image file.');
        return;
      }
      if (typeof file.size !== 'number' || file.size <= 0) {
        Alert.alert('Invalid File', 'Selected image file is invalid (size 0).');
        return;
      }
      if (typeof file.type !== 'string' || !file.type.startsWith('image/')) {
        Alert.alert('Invalid File', 'Please select a valid image.');
        return;
      }
      const previewUri =
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file)
          : null;

      uploadLog('pick:result', {
        source: 'web:file-input',
        name: file?.name ?? null,
        type: file?.type ?? null,
        size: typeof file?.size === 'number' ? file.size : null,
        uri: previewUri || null,
      });

      setSelectedImages(prev => [...prev, previewUri || '']);
      setSelectedImageFiles(prev => [...prev, file]);
      return;
    }

    uploadLog('pick:start', { source: 'expo-image-picker:library' });
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Permission Required',
        'Permission to access camera roll is required!'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets?.[0];
      uploadLog('pick:result', {
        source: 'expo-image-picker:library',
        name: asset?.fileName ?? null,
        type: asset?.mimeType ?? asset?.type ?? null,
        size: asset?.fileSize ?? null,
        uri: asset?.uri ?? null,
      });
      setSelectedImages([...selectedImages, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const DEBUG =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('FP_UPLOAD_DEBUG') === '1';
    const uploadLog = (...args) => {
      if (!DEBUG) return;
      console.log('[upload]', ...args);
    };

    uploadLog('pick:start', { source: 'expo-image-picker:camera' });
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Permission Required',
        'Permission to access camera is required!'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets?.[0];
      uploadLog('pick:result', {
        source: 'expo-image-picker:camera',
        name: asset?.fileName ?? null,
        type: asset?.mimeType ?? asset?.type ?? null,
        size: asset?.fileSize ?? null,
        uri: asset?.uri ?? null,
      });
      setSelectedImages([...selectedImages, result.assets[0].uri]);
    }
  };

  const removeImage = index => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    if (Platform.OS === 'web') {
      setSelectedImageFiles(selectedImageFiles.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!activity) {
      Alert.alert('Error', 'Please select an activity type');
      return;
    }

    setUploading(true);

    try {
      // Upload images to Firebase Storage if any
      let imageUrls = [];
      if (selectedImages.length > 0) {
        const uploads =
          Platform.OS === 'web' && selectedImageFiles.length > 0
            ? selectedImageFiles
            : selectedImages;
        imageUrls = await uploadMultipleImages(uploads, 'posts');
      }

      // Calculate cost per acre for field tracking
      let totalCostPerAcre = 0;
      const acres = formData.acres
        ? parseFloat(formData.acres.replace(/,/g, ''))
        : 0;

      if (acres > 0) {
        if (
          activity === 'planting' &&
          formData.population &&
          formData.totalCost &&
          formData.crop
        ) {
          const population = parseFloat(formData.population.replace(/,/g, ''));
          const costPerBag = parseFloat(formData.totalCost.replace(/,/g, ''));
          const cropLower = formData.crop.toLowerCase();

          let seedsPerBag;
          if (cropLower.includes('corn')) {
            seedsPerBag = 80000;
          } else if (cropLower.includes('bean') || cropLower.includes('soy')) {
            seedsPerBag = 140000;
          }

          if (seedsPerBag) {
            const bagsPerAcre = population / seedsPerBag;
            totalCostPerAcre = bagsPerAcre * costPerBag;

            // Add fertilizer cost
            if (formData.fertilizerCost) {
              totalCostPerAcre +=
                parseFloat(formData.fertilizerCost.replace(/,/g, '')) / acres;
            }

            // Add fuel cost
            if (formData.fuelUsed && formData.fuelCostPerGallon) {
              const totalFuelCost =
                parseFloat(formData.fuelUsed.replace(/,/g, '')) *
                parseFloat(formData.fuelCostPerGallon.replace(/,/g, ''));
              totalCostPerAcre += totalFuelCost / acres;
            }
          }
        } else if (
          (activity === 'spraying' || activity === 'fertilizing') &&
          formData.totalCost
        ) {
          totalCostPerAcre =
            parseFloat(formData.totalCost.replace(/,/g, '')) / acres;

          // Add fuel cost
          if (formData.fuelUsed && formData.fuelCostPerGallon) {
            const totalFuelCost =
              parseFloat(formData.fuelUsed.replace(/,/g, '')) *
              parseFloat(formData.fuelCostPerGallon.replace(/,/g, ''));
            totalCostPerAcre += totalFuelCost / acres;
          }
        } else if (
          (activity === 'harvesting' || activity === 'tillage') &&
          formData.fuelUsed &&
          formData.fuelCostPerGallon
        ) {
          const totalFuelCost =
            parseFloat(formData.fuelUsed.replace(/,/g, '')) *
            parseFloat(formData.fuelCostPerGallon.replace(/,/g, ''));
          totalCostPerAcre = totalFuelCost / acres;
        } else if (activity === 'land') {
          if (formData.landType === 'Rent' && formData.rentPrice) {
            totalCostPerAcre = parseFloat(formData.rentPrice.replace(/,/g, ''));
          } else if (
            formData.landType === 'Purchase' &&
            formData.annualMortgage
          ) {
            totalCostPerAcre =
              parseFloat(formData.annualMortgage.replace(/,/g, '')) / acres;
          }
        }

        // Record cost to field if selected
        if (selectedField && totalCostPerAcre > 0) {
          const currentYear = new Date().getFullYear();
          const totalCost = totalCostPerAcre * acres;
          await recordFieldCost(selectedField, totalCost, currentYear);
        }
      }

      // Record maintenance costs (not tied to a field)
      if (activity === 'maintenance' && formData.cost) {
        const currentYear = new Date().getFullYear();
        const maintenanceCost = parseFloat(formData.cost.replace(/,/g, ''));
        await recordFieldCost('maintenance', maintenanceCost, currentYear);
      }

      // Record harvested bushels to the selected field so Marketing can auto-populate later.
      // Auto-calculate total bushels = acres * yield (bu/acre).
      if (
        activity === 'harvesting' &&
        selectedField &&
        formData.yield &&
        acres > 0
      ) {
        const currentYear = new Date().getFullYear();
        const yieldBuPerAcre = parseFloat(
          formData.yield
            .toString()
            .replace(/,/g, '')
            .replace(/[^0-9.]/g, '')
        );
        const totalBushels =
          acres * (Number.isNaN(yieldBuPerAcre) ? 0 : yieldBuPerAcre);
        if (!Number.isNaN(totalBushels) && totalBushels > 0) {
          await recordFieldHarvestBushels(
            selectedField,
            totalBushels,
            currentYear
          );
        }
      }

      // Record marketing revenue
      if (
        activity === 'marketing' &&
        formData.bushels &&
        formData.pricePerBushel
      ) {
        const currentYear = new Date().getFullYear();
        const bushels = parseFloat(formData.bushels.replace(/,/g, ''));
        const pricePerBushel = parseFloat(
          formData.pricePerBushel.replace(/,/g, '')
        );
        const totalRevenue = bushels * pricePerBushel;
        await recordMarketingRevenue(totalRevenue, currentYear);
      }

      await addPost({
        type: 'fencepost',
        activity: activity,
        chatRoom: 'national',
        data: formData,
        images: imageUrls, // Use Firebase Storage URLs
        zipCode: userProfile?.zipCode || '',
        city: userProfile?.city || '',
        state: userProfile?.state || '',
        username: userProfile?.username || null,
      });

      if (postToStateAlso && userProfile?.state) {
        await addPost({
          type: 'fencepost',
          activity: activity,
          chatRoom: 'state',
          data: formData,
          images: imageUrls,
          zipCode: userProfile?.zipCode || '',
          city: userProfile?.city || '',
          state: userProfile?.state || '',
          username: userProfile?.username || null,
        });
      }

      Alert.alert('Success', 'FencePost created!');
      setActivity('');
      setSelectedField('');
      setFormData({});
      setSelectedImages([]);
      setSelectedImageFiles([]);
      navigation.navigate('Main', { screen: 'Feed' });
    } catch (error) {
      console.error('Error creating post:', error);
      const code = error?.code ? String(error.code) : null;
      const message = error?.message
        ? String(error.message)
        : 'Failed to create FencePost. Please try again.';
      Alert.alert('Error', code ? `${message}\n(${code})` : message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell title="Create">
      <View style={styles.container}>
        <View
          style={[styles.mainContent, isMobile && styles.mainContentMobile]}
        >
          {/* Activity Dropdown - Top on mobile, left on desktop */}
          <View style={[styles.leftPanel, isMobile && styles.leftPanelMobile]}>
            <Text style={styles.sectionTitle}>Activity Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={activity}
                onValueChange={value => {
                  setActivity(value);
                  setSelectedField('');
                  setFormData({});
                }}
                style={styles.picker}
                testID="fencepost-activity"
              >
                <Picker.Item label="Choose an activity..." value="" />
                {activities.map(act => (
                  <Picker.Item key={act.id} label={act.label} value={act.id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Form */}
          <ScrollView
            style={[styles.rightPanel, isMobile && styles.rightPanelMobile]}
          >
            {activity ? (
              <>
                {/* Field Selector - Only show for activities with acres */}
                {activity !== 'maintenance' && fields.length > 0 && (
                  <View style={styles.fieldSelectorContainer}>
                    <Text style={styles.fieldSelectorLabel}>
                      Select Field (Optional)
                    </Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedField}
                        onValueChange={fieldId => {
                          setSelectedField(fieldId);
                          // Auto-populate acres/bushels when field is selected
                          if (fieldId) {
                            const field = fields.find(f => f.id === fieldId);
                            if (field) {
                              if (
                                activity !== 'marketing' &&
                                field.acres != null
                              ) {
                                updateFormData('acres', field.acres.toString());
                              }

                              if (activity === 'marketing') {
                                const currentYear = new Date().getFullYear();
                                fetchFieldHarvestBushelsYearlyTotal(
                                  fieldId,
                                  currentYear
                                ).then(harvestedBushels => {
                                  if (harvestedBushels > 0) {
                                    updateFormData(
                                      'bushels',
                                      harvestedBushels.toString()
                                    );
                                  }
                                });
                              }
                            }
                          }
                        }}
                        style={styles.picker}
                        testID="fencepost-field"
                      >
                        <Picker.Item label="No field selected" value="" />
                        {fields.map(field => (
                          <Picker.Item
                            key={field.id}
                            label={`${field.name} (${field.acres} acres)`}
                            value={field.id}
                          />
                        ))}
                      </Picker>
                    </View>
                    <Text style={styles.fieldSelectorHint}>
                      Tip: Harvesting records bushels to the field. Marketing
                      selecting a field can auto-fill bushels sold.
                    </Text>
                  </View>
                )}

                <Text style={styles.formTitle}>Activity Details</Text>

                {/* Organize fields into sections */}
                {getFormFields().map((field, index) => {
                  // Skip conditional fields if condition not met
                  if (
                    field.condition &&
                    formData[field.condition] !== field.conditionValue
                  ) {
                    return null;
                  }

                  // Determine if this is a new section
                  const isFirstField = index === 0;
                  const isNotesField = field.key === 'notes';
                  const isFuelField =
                    field.key === 'fuelUsed' ||
                    field.key === 'fuelCostPerGallon';

                  return (
                    <View key={field.key}>
                      {/* Section divider for notes */}
                      {isNotesField && (
                        <View style={styles.sectionDivider}>
                          <Text style={styles.sectionDividerText}>
                            Additional Notes
                          </Text>
                        </View>
                      )}

                      {/* Section divider for fuel */}
                      {field.key === 'fuelUsed' && (
                        <View style={styles.sectionDivider}>
                          <Text style={styles.sectionDividerText}>
                            Fuel Usage
                          </Text>
                        </View>
                      )}

                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>{field.label}</Text>
                        {field.type === 'dropdown' ? (
                          <View style={styles.pickerContainer}>
                            <Picker
                              selectedValue={formData[field.key] || ''}
                              onValueChange={value =>
                                updateFormData(field.key, value)
                              }
                              style={styles.picker}
                              testID={`fencepost-input-${field.key}`}
                            >
                              <Picker.Item
                                label={`Select ${field.label.toLowerCase()}...`}
                                value=""
                              />
                              {field.options.map(option => (
                                <Picker.Item
                                  key={option}
                                  label={option}
                                  value={option}
                                />
                              ))}
                            </Picker>
                          </View>
                        ) : (
                          <TextInput
                            style={[
                              styles.input,
                              field.multiline && styles.textArea,
                            ]}
                            placeholder={field.placeholder}
                            placeholderTextColor="#adb5bd"
                            value={formData[field.key] || ''}
                            onChangeText={value =>
                              updateFormData(field.key, value)
                            }
                            keyboardType={field.keyboardType || 'default'}
                            multiline={field.multiline}
                            numberOfLines={field.multiline ? 4 : 1}
                            testID={`fencepost-input-${field.key}`}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Price Per Acre Calculation */}
                {activity === 'planting' &&
                  formData.population &&
                  formData.totalCost &&
                  formData.crop &&
                  (() => {
                    const population = parseFloat(
                      formData.population.replace(/,/g, '')
                    );
                    const costPerBag = parseFloat(
                      formData.totalCost.replace(/,/g, '')
                    );
                    const cropLower = formData.crop.toLowerCase();

                    let seedsPerBag;
                    if (cropLower.includes('corn')) {
                      seedsPerBag = 80000;
                    } else if (
                      cropLower.includes('bean') ||
                      cropLower.includes('soy')
                    ) {
                      seedsPerBag = 140000;
                    } else {
                      return null; // Don't show calculation for unknown crops
                    }

                    const bagsPerAcre = population / seedsPerBag;
                    let costPerAcre = bagsPerAcre * costPerBag;

                    // Add fertilizer cost if available
                    if (formData.acres && formData.fertilizerCost) {
                      const fertilizerCostPerAcre =
                        parseFloat(formData.fertilizerCost.replace(/,/g, '')) /
                        parseFloat(formData.acres.replace(/,/g, ''));
                      costPerAcre += fertilizerCostPerAcre;
                    }

                    // Add fuel cost if available
                    if (
                      formData.acres &&
                      formData.fuelUsed &&
                      formData.fuelCostPerGallon
                    ) {
                      const totalFuelCost =
                        parseFloat(formData.fuelUsed.replace(/,/g, '')) *
                        parseFloat(
                          formData.fuelCostPerGallon.replace(/,/g, '')
                        );
                      const fuelCostPerAcre =
                        totalFuelCost /
                        parseFloat(formData.acres.replace(/,/g, ''));
                      costPerAcre += fuelCostPerAcre;
                    }

                    return (
                      <View style={styles.calculationBox}>
                        <Text style={styles.calculationLabel}>
                          Price Per Acre:
                        </Text>
                        <Text style={styles.calculationValue}>
                          ${costPerAcre.toFixed(2)}/acre
                        </Text>
                      </View>
                    );
                  })()}

                {(activity === 'spraying' || activity === 'fertilizing') &&
                  formData.acres &&
                  formData.totalCost &&
                  (() => {
                    let costPerAcre =
                      parseFloat(formData.totalCost.replace(/,/g, '')) /
                      parseFloat(formData.acres.replace(/,/g, ''));

                    // Add fuel cost if available
                    if (formData.fuelUsed && formData.fuelCostPerGallon) {
                      const totalFuelCost =
                        parseFloat(formData.fuelUsed.replace(/,/g, '')) *
                        parseFloat(
                          formData.fuelCostPerGallon.replace(/,/g, '')
                        );
                      const fuelCostPerAcre =
                        totalFuelCost /
                        parseFloat(formData.acres.replace(/,/g, ''));
                      costPerAcre += fuelCostPerAcre;
                    }

                    return (
                      <View style={styles.calculationBox}>
                        <Text style={styles.calculationLabel}>
                          Price Per Acre:
                        </Text>
                        <Text style={styles.calculationValue}>
                          ${costPerAcre.toFixed(2)}/acre
                        </Text>
                      </View>
                    );
                  })()}

                {(activity === 'harvesting' || activity === 'tillage') &&
                  formData.acres &&
                  formData.fuelUsed &&
                  formData.fuelCostPerGallon &&
                  (() => {
                    const totalFuelCost =
                      parseFloat(formData.fuelUsed.replace(/,/g, '')) *
                      parseFloat(formData.fuelCostPerGallon.replace(/,/g, ''));
                    const fuelCostPerAcre =
                      totalFuelCost /
                      parseFloat(formData.acres.replace(/,/g, ''));

                    return (
                      <View style={styles.calculationBox}>
                        <Text style={styles.calculationLabel}>
                          Fuel Cost Per Acre:
                        </Text>
                        <Text style={styles.calculationValue}>
                          ${fuelCostPerAcre.toFixed(2)}/acre
                        </Text>
                      </View>
                    );
                  })()}

                {/* Marketing Calculation */}
                {activity === 'marketing' &&
                  formData.bushels &&
                  formData.pricePerBushel &&
                  (() => {
                    const bushels = parseFloat(
                      formData.bushels.replace(/,/g, '')
                    );
                    const pricePerBushel = parseFloat(
                      formData.pricePerBushel.replace(/,/g, '')
                    );
                    const totalRevenue = bushels * pricePerBushel;

                    return (
                      <View style={styles.calculationBox}>
                        <Text style={styles.calculationLabel}>
                          Total Revenue:
                        </Text>
                        <Text style={styles.calculationValue}>
                          $
                          {totalRevenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                    );
                  })()}

                {/* Land Cost Calculation */}
                {activity === 'land' &&
                  formData.acres &&
                  (() => {
                    const acres = parseFloat(formData.acres.replace(/,/g, ''));
                    let costPerAcre = 0;

                    if (formData.landType === 'Rent' && formData.rentPrice) {
                      costPerAcre = parseFloat(
                        formData.rentPrice.replace(/,/g, '')
                      );
                      return (
                        <View style={styles.calculationBox}>
                          <Text style={styles.calculationLabel}>
                            Rent Cost Per Acre:
                          </Text>
                          <Text style={styles.calculationValue}>
                            ${costPerAcre.toFixed(2)}/acre
                          </Text>
                        </View>
                      );
                    } else if (
                      formData.landType === 'Purchase' &&
                      formData.annualMortgage
                    ) {
                      costPerAcre =
                        parseFloat(formData.annualMortgage.replace(/,/g, '')) /
                        acres;
                      return (
                        <View style={styles.calculationBox}>
                          <Text style={styles.calculationLabel}>
                            Annual Mortgage Cost Per Acre:
                          </Text>
                          <Text style={styles.calculationValue}>
                            ${costPerAcre.toFixed(2)}/acre
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}

                {/* Image Upload Section */}
                <Text style={styles.sectionTitle}>Photos (Optional)</Text>

                {selectedImages.length > 0 && (
                  <ScrollView horizontal style={styles.imagePreviewContainer}>
                    {selectedImages.map((uri, index) => (
                      <View key={index} style={styles.imagePreviewWrapper}>
                        <Image source={{ uri }} style={styles.imagePreview} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImage(index)}
                        >
                          <Text style={styles.removeImageText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View style={styles.imageButtons}>
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={pickImage}
                    testID="fencepost-addphoto"
                  >
                    <Text style={styles.imageButtonText}>Add Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={takePhoto}
                    testID="fencepost-takephoto"
                  >
                    <Text style={styles.imageButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.postOptionsRow}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setPostToStateAlso(v => !v)}
                    disabled={!userProfile?.state}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        postToStateAlso && styles.checkboxChecked,
                        !userProfile?.state && styles.checkboxDisabled,
                      ]}
                    />
                    <Text style={styles.checkboxLabel}>
                      Post to state board as well
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    uploading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={uploading}
                  testID="fencepost-submit"
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Post FencePost</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Choose an activity to start your post
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    padding: 20,
    paddingBottom: 5,
    color: '#2D5016',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 20,
    paddingBottom: 20,
    color: '#555',
    fontStyle: 'italic',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContentMobile: {
    flexDirection: 'column',
  },
  leftPanel: {
    width: 280,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leftPanelMobile: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    margin: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rightPanel: {
    flex: 1,
    padding: 20,
  },
  rightPanelMobile: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    color: '#2D5016',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 15,
    color: '#2D5016',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  fieldSelectorContainer: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 6,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#81C784',
  },
  fieldSelectorLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: '#2D5016',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fieldSelectorHint: {
    fontSize: 13,
    color: '#555',
    marginTop: 10,
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#81C784',
    overflow: 'hidden',
    minHeight: 52,
  },
  picker: {
    height: 52,
    color: '#2C2C2C',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  sectionDivider: {
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e9ecef',
  },
  sectionDividerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    color: '#2D5016',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 6,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#81C784',
    color: '#2C2C2C',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#ACD1AF',
    padding: 18,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
    borderColor: '#999',
  },
  submitButtonText: {
    color: '#2D5016',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imageButtonText: {
    fontSize: 14,
    color: '#333',
  },
  imagePreviewContainer: {
    marginBottom: 15,
  },
  imagePreviewWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#d32f2f',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calculationBox: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#81C784',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculationLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D5016',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  calculationValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D5016',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  imageButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  imageButtonText: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginBottom: 18,
  },
  imagePreviewWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#dc3545',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 17,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  postOptionsRow: {
    marginTop: 12,
    marginBottom: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#2D5016',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#ACD1AF',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkboxLabel: {
    color: '#2D5016',
    fontSize: 14,
    fontWeight: '700',
  },
});
