import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../layout/AppShell';
import { SEO } from '../../components/SEO';

export default function ProfileScreen({ route }) {
  const {
    userProfile,
    fields,
    addField,
    deleteField,
    clearFieldData,
    getFieldYearlyTotal,
    getAllFieldsYearlyTotal,
    getMarketingRevenueTotal,
    clearYearCosts,
    clearYearRevenue,
    getRainfallYearlyTotal,
    getRainfallMonthlyTotal,
    clearYearRainfall,
    clearMonthRainfall,
    updateUsername,
    user,
  } = useAuth();
  const [showAddField, setShowAddField] = useState(false);
  const [showEditUsername, setShowEditUsername] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldAcres, setNewFieldAcres] = useState('');
  const [newUsername, setNewUsername] = useState('');

  const profileSlug =
    (route?.params?.profileId || route?.params?.username || userProfile?.username || user?.uid || 'profile')
      ?.toString?.()
      ?.trim?.() || 'profile';
  const canonicalPath = `/profile/${profileSlug}`;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleReportConcern = () => {
    const email = 'calebc9298@outlook.com';
    const subject = 'FencePost - Report a Concern';
    const body = 'Please describe your concern:\n\n';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl).catch(err => {
      Alert.alert(
        'Error',
        'Could not open email client. Please email calebc9298@outlook.com directly.'
      );
    });
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      Alert.alert('Error', 'Please enter a field name');
      return;
    }
    if (!newFieldAcres || isNaN(parseFloat(newFieldAcres))) {
      Alert.alert('Error', 'Please enter valid acres');
      return;
    }

    addField({
      name: newFieldName.trim(),
      acres: parseFloat(newFieldAcres),
    });

    setNewFieldName('');
    setNewFieldAcres('');
    setShowAddField(false);
  };

  const handleDeleteField = (fieldId, fieldName) => {
    if (confirm(`Are you sure you want to delete "${fieldName}"?`)) {
      deleteField(fieldId);
    }
  };

  const handleClearFieldData = (fieldId, fieldName) => {
    if (
      confirm(
        `Clear all data for "${fieldName}"? This will remove all costs and transactions but keep the field.`
      )
    ) {
      clearFieldData(fieldId)
        .then(() => {
          alert('Field data cleared successfully');
        })
        .catch(error => {
          alert('Error clearing field data: ' + error.message);
        });
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      alert('Please enter a username');
      return;
    }

    try {
      await updateUsername(newUsername.trim());
      setNewUsername('');
      setShowEditUsername(false);
      alert('Username updated successfully');
    } catch (error) {
      alert('Error updating username: ' + error.message);
    }
  };

  const handleClearYearCosts = async () => {
    if (
      confirm(
        `Clear ALL field costs for ${currentYear}? This removes current-year costs across all fields.`
      )
    ) {
      try {
        await clearYearCosts(currentYear);
        alert('Yearly costs cleared successfully');
      } catch (error) {
        alert('Error clearing yearly costs: ' + error.message);
      }
    }
  };

  const handleClearYearRevenue = async () => {
    if (
      confirm(
        `Clear ALL marketing revenue for ${currentYear}? This removes current-year revenue totals.`
      )
    ) {
      try {
        await clearYearRevenue(currentYear);
        alert('Yearly revenue cleared successfully');
      } catch (error) {
        alert('Error clearing yearly revenue: ' + error.message);
      }
    }
  };

  const handleClearYearRain = async () => {
    if (
      confirm(
        `Clear ALL rainfall totals for ${currentYear}? This removes the yearly total and all months for that year.`
      )
    ) {
      try {
        await clearYearRainfall(currentYear);
        alert('Yearly rainfall cleared successfully');
      } catch (error) {
        alert('Error clearing yearly rainfall: ' + error.message);
      }
    }
  };

  const handleClearMonthRain = async () => {
    if (
      confirm(
        `Clear rainfall for ${monthName} ${currentYear}? This removes only that month.`
      )
    ) {
      try {
        await clearMonthRainfall(currentYear, currentMonth);
        alert(`${monthName} rainfall cleared successfully`);
      } catch (error) {
        alert('Error clearing monthly rainfall: ' + error.message);
      }
    }
  };

  const totalAcres = fields.reduce((sum, field) => sum + field.acres, 0);
  const yearlyTotal = getAllFieldsYearlyTotal(currentYear);
  const maintenanceCosts = getFieldYearlyTotal('maintenance', currentYear);
  const totalCosts = yearlyTotal + maintenanceCosts;
  const marketingRevenue = getMarketingRevenueTotal(currentYear);
  const yearlyRainfall = getRainfallYearlyTotal(currentYear);
  const monthlyRainfall = getRainfallMonthlyTotal(currentYear, currentMonth);
  const monthName = new Date().toLocaleString('default', { month: 'long' });

  const metaTitle = `${profileSlug} | FencePost Profile`;
  const metaDescription = `View ${profileSlug}'s farm activity, rainfall, and field stats on FencePost.`;
  const canonicalUrl = `https://fencepost.net${canonicalPath}`;

  return (
    <>
      <SEO
        title={metaTitle}
        description={metaDescription}
        canonical={canonicalUrl}
        url={canonicalUrl}
      />
      <AppShell title="Profile">
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {/* Fields Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.moistureContainer}>
              <Text style={styles.moistureTitle}>Total Moisture</Text>
              <View style={styles.moistureStats}>
                <View style={styles.moistureStat}>
                  <Text style={styles.moistureLabel}>Yearly:</Text>
                  <Text style={styles.moistureValue}>
                    {yearlyRainfall.toFixed(2)}"
                  </Text>
                </View>
                <View style={styles.moistureStat}>
                  <Text style={styles.moistureLabel}>{monthName}:</Text>
                  <Text style={styles.moistureValue}>
                    {monthlyRainfall.toFixed(2)}"
                  </Text>
                </View>
                <View style={styles.rainClearRow}>
                  <TouchableOpacity
                    style={[styles.smallAction, styles.clearCostsButton]}
                    onPress={handleClearYearRain}
                  >
                    <Text style={styles.smallActionText}>Clear Year Rain</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallAction, styles.clearRevenueButton]}
                    onPress={handleClearMonthRain}
                  >
                    <Text style={styles.smallActionText}>Clear Month Rain</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={styles.sectionTitle}>My Farm</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddField(true)}
              testID="profile-add-field-open"
            >
              <Text style={styles.addButtonText}>+ Add Field</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Acres:</Text>
              <Text style={styles.summaryValue}>
                {totalAcres.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {currentYear} Total Costs:
              </Text>
              <Text style={styles.summaryValue}>
                $
                {totalCosts.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {currentYear} Total Revenue:
              </Text>
              <Text style={[styles.summaryValue, styles.revenueText]}>
                $
                {marketingRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.clearRow}>
              <TouchableOpacity
                style={[styles.smallAction, styles.clearCostsButton]}
                onPress={handleClearYearCosts}
              >
                <Text style={styles.smallActionText}>
                  Clear {currentYear} Costs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallAction, styles.clearRevenueButton]}
                onPress={handleClearYearRevenue}
              >
                <Text style={styles.smallActionText}>
                  Clear {currentYear} Revenue
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {fields.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No fields added yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first field to start tracking costs
              </Text>
            </View>
          ) : (
            fields.map(field => {
              const fieldTotal = getFieldYearlyTotal(field.id, currentYear);
              const costPerAcre =
                field.acres > 0 ? fieldTotal / field.acres : 0;

              return (
                <View key={field.id} style={styles.fieldCard}>
                  <View style={styles.fieldHeader}>
                    <Text style={styles.fieldName}>{field.name}</Text>
                    <View style={styles.fieldActions}>
                      <TouchableOpacity
                        onPress={() =>
                          handleClearFieldData(field.id, field.name)
                        }
                      >
                        <Text style={styles.clearButton}>Clear</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteField(field.id, field.name)}
                      >
                        <Text style={styles.deleteButton}>Del</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.fieldDetails}>
                    <View style={styles.fieldStat}>
                      <Text style={styles.fieldStatLabel}>Acres</Text>
                      <Text style={styles.fieldStatValue}>{field.acres}</Text>
                    </View>
                    <View style={styles.fieldStat}>
                      <Text style={styles.fieldStatLabel}>
                        {currentYear} Total
                      </Text>
                      <Text style={styles.fieldStatValue}>
                        ${fieldTotal.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.fieldStat}>
                      <Text style={styles.fieldStatLabel}>Cost/Acre</Text>
                      <Text style={styles.fieldStatValue}>
                        ${costPerAcre.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Username and Logout Section */}
        <View style={styles.section}>
          <View style={styles.userActionsRow}>
            <View style={styles.usernameDisplay}>
              <Text style={styles.usernameLabel}>Username:</Text>
              <Text style={styles.usernameValue}>
                {userProfile?.username || 'Not set'}
              </Text>
            </View>

            <View style={styles.emailDisplay}>
              <Text style={styles.emailLabel}>Email:</Text>
              <Text style={styles.emailValue}>{user?.email || 'N/A'}</Text>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setNewUsername(userProfile?.username || '');
                setShowEditUsername(true);
              }}
              testID="profile-edit-username-open"
            >
              <Text style={styles.actionButtonText}>
                {userProfile?.username ? 'Edit' : '+ Add'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              testID="profile-logout"
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleReportConcern}
              testID="profile-report-concern"
            >
              <Text style={styles.reportButtonText}>Report a Concern</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Field Modal */}
        <Modal
          visible={showAddField}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddField(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Field</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Field Name</Text>
                <TextInput
                  style={styles.input}
                  value={newFieldName}
                  onChangeText={setNewFieldName}
                  placeholder="e.g., North 40, Back Forty"
                  testID="profile-add-field-name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Acres</Text>
                <TextInput
                  style={styles.input}
                  value={newFieldAcres}
                  onChangeText={setNewFieldAcres}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  testID="profile-add-field-acres"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddField(false);
                    setNewFieldName('');
                    setNewFieldAcres('');
                  }}
                  testID="profile-add-field-cancel"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddField}
                  testID="profile-add-field-save"
                >
                  <Text style={styles.saveButtonText}>Add Field</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Username Modal */}
        <Modal
          visible={showEditUsername}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditUsername(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {userProfile?.username ? 'Edit Username' : 'Create Username'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  placeholder="Enter your username"
                  autoCapitalize="none"
                  testID="profile-edit-username-input"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowEditUsername(false);
                    setNewUsername('');
                  }}
                  testID="profile-edit-username-cancel"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleUpdateUsername}
                  testID="profile-edit-username-save"
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
      </AppShell>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    margin: 20,
    marginBottom: 10,
    color: '#2D5016',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  moistureContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1976d2',
    minWidth: 140,
  },
  moistureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  moistureStats: {
    gap: 5,
  },
  rainClearRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  moistureStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moistureLabel: {
    fontSize: 12,
    color: '#666',
  },
  moistureValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D5016',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  addButton: {
    backgroundColor: '#ACD1AF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  addButtonText: {
    color: '#2D5016',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 6,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#81C784',
  },
  clearRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  smallAction: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clearCostsButton: {
    borderColor: '#f59e0b',
    backgroundColor: '#fff7ed',
  },
  clearRevenueButton: {
    borderColor: '#b91c1c',
    backgroundColor: '#fef2f2',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#555',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D5016',
  },
  revenueText: {
    color: '#2D5016',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  fieldCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#81C784',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D5016',
    letterSpacing: 0.5,
  },
  fieldActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  clearButton: {
    fontSize: 13,
    padding: 6,
    color: '#f59e0b',
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  deleteButton: {
    fontSize: 14,
    padding: 5,
    color: '#666',
    fontWeight: '700',
  },
  fieldDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldStat: {
    flex: 1,
    alignItems: 'center',
  },
  fieldStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fieldStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D5016',
  },
  userActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  usernameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '100%',
  },
  usernameLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  usernameValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D5016',
  },
  emailDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '100%',
  },
  emailLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  emailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D5016',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  actionButton: {
    backgroundColor: '#ACD1AF',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2D5016',
    minWidth: 100,
  },
  actionButtonText: {
    color: '#2D5016',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 100,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportButton: {
    backgroundColor: 'transparent',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 80,
    marginTop: 8,
  },
  reportButtonText: {
    color: '#6c757d',
    fontSize: 10,
    fontWeight: '500',
    textDecoration: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: '#81C784',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D5016',
    marginBottom: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#81C784',
    borderRadius: 6,
    padding: 14,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#2C2C2C',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#ACD1AF',
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  saveButtonText: {
    color: '#2D5016',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
