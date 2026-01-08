import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState([
    { id: '1', name: 'North 40', acres: 40 },
    { id: '2', name: 'South Field', acres: 80 },
  ]);
  const [fieldCosts, setFieldCosts] = useState({});
  const [fieldHarvestBushels, setFieldHarvestBushels] = useState({});
  const [marketingRevenue, setMarketingRevenue] = useState({});
  const [rainGaugeData, setRainGaugeData] = useState({});

  const addField = async field => {
    if (!user) return;

    try {
      const newField = {
        ...field,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };
      const docRef = doc(collection(db, 'fields'));
      await setDoc(docRef, newField);
      setFields([...fields, { id: docRef.id, ...newField }]);
    } catch (error) {
      console.error('Error adding field:', error);
    }
  };

  const deleteField = async fieldId => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'fields', fieldId));
      setFields(fields.filter(f => f.id !== fieldId));
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  const clearFieldData = async fieldId => {
    if (!user) return;

    try {
      // Clear all field costs for this field
      const costDocs = await getDocs(
        query(
          collection(db, 'fieldCosts'),
          where('userId', '==', user.uid),
          where('fieldId', '==', fieldId)
        )
      );
      for (const docSnap of costDocs.docs) {
        await deleteDoc(doc(db, 'fieldCosts', docSnap.id));
      }

      // Clear all field harvest bushels for this field
      const harvestDocs = await getDocs(
        query(
          collection(db, 'fieldHarvestBushels'),
          where('userId', '==', user.uid),
          where('fieldId', '==', fieldId)
        )
      );
      for (const docSnap of harvestDocs.docs) {
        await deleteDoc(doc(db, 'fieldHarvestBushels', docSnap.id));
      }

      // Update local state - remove all costs and harvest data for this field
      setFieldCosts(prev => {
        const newCosts = { ...prev };
        Object.keys(newCosts).forEach(key => {
          if (key.startsWith(`${fieldId}-`)) {
            delete newCosts[key];
          }
        });
        return newCosts;
      });

      setFieldHarvestBushels(prev => {
        const newHarvest = { ...prev };
        Object.keys(newHarvest).forEach(key => {
          if (key.startsWith(`${fieldId}-`)) {
            delete newHarvest[key];
          }
        });
        return newHarvest;
      });
    } catch (error) {
      console.error('Error clearing field data:', error);
      throw error;
    }
  };

  const recordFieldCost = async (fieldId, cost, year) => {
    if (!user) return;

    const key = `${fieldId}-${year}`;
    const newTotal = (fieldCosts[key] || 0) + cost;

    try {
      const costDocRef = doc(db, 'fieldCosts', `${user.uid}-${key}`);
      await setDoc(
        costDocRef,
        {
          userId: user.uid,
          fieldId,
          year,
          totalCost: newTotal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setFieldCosts(prev => ({
        ...prev,
        [key]: newTotal,
      }));
    } catch (error) {
      console.error('Error recording field cost:', error);
    }
  };

  const getFieldYearlyTotal = (fieldId, year) => {
    const key = `${fieldId}-${year}`;
    return fieldCosts[key] || 0;
  };

  const getAllFieldsYearlyTotal = year => {
    return Object.entries(fieldCosts)
      .filter(([key]) => key.endsWith(`-${year}`))
      .reduce((sum, [, cost]) => sum + cost, 0);
  };

  const recordFieldHarvestBushels = async (fieldId, bushels, year) => {
    if (!user) return;

    const key = `${fieldId}-${year}`;
    const newTotal = (fieldHarvestBushels[key] || 0) + bushels;

    try {
      const harvestDocRef = doc(
        db,
        'fieldHarvestBushels',
        `${user.uid}-${key}`
      );
      await setDoc(
        harvestDocRef,
        {
          userId: user.uid,
          fieldId,
          year,
          totalBushels: newTotal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setFieldHarvestBushels(prev => ({
        ...prev,
        [key]: newTotal,
      }));
    } catch (error) {
      console.error('Error recording field harvest bushels:', error);
      throw error;
    }
  };

  const getFieldHarvestBushelsYearlyTotal = (fieldId, year) => {
    const key = `${fieldId}-${year}`;
    return fieldHarvestBushels[key] || 0;
  };

  const fetchFieldHarvestBushelsYearlyTotal = async (fieldId, year) => {
    if (!user) return 0;

    const key = `${fieldId}-${year}`;
    const cached = fieldHarvestBushels[key];
    if (typeof cached === 'number') return cached;

    try {
      const snap = await getDoc(
        doc(db, 'fieldHarvestBushels', `${user.uid}-${key}`)
      );
      if (!snap.exists()) return 0;
      const data = snap.data();
      const total = data?.totalBushels || 0;
      setFieldHarvestBushels(prev => ({
        ...prev,
        [key]: total,
      }));
      return total;
    } catch (error) {
      console.error('Error fetching field harvest bushels:', error);
      return 0;
    }
  };

  const recordMarketingRevenue = async (revenue, year) => {
    if (!user) return;

    const newTotal = (marketingRevenue[year] || 0) + revenue;

    try {
      const revenueDocRef = doc(db, 'marketingRevenue', `${user.uid}-${year}`);
      await setDoc(
        revenueDocRef,
        {
          userId: user.uid,
          year,
          totalRevenue: newTotal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setMarketingRevenue(prev => ({
        ...prev,
        [year]: newTotal,
      }));
    } catch (error) {
      console.error('Error recording marketing revenue:', error);
    }
  };

  const getMarketingRevenueTotal = year => {
    return marketingRevenue[year] || 0;
  };

  // Clear all costs for a given year across all fields (current user)
  const clearYearCosts = async year => {
    if (!user) return;
    try {
      const costDocs = await getDocs(
        query(
          collection(db, 'fieldCosts'),
          where('userId', '==', user.uid),
          where('year', '==', year)
        )
      );
      for (const docSnap of costDocs.docs) {
        await deleteDoc(doc(db, 'fieldCosts', docSnap.id));
      }

      // Remove from local state keys ending with -year
      setFieldCosts(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.endsWith(`-${year}`)) delete next[key];
        });
        return next;
      });
    } catch (error) {
      console.error('Error clearing yearly costs:', error);
      throw error;
    }
  };

  // Clear marketing revenue for a given year (current user)
  const clearYearRevenue = async year => {
    if (!user) return;
    try {
      const revenueDocRef = doc(db, 'marketingRevenue', `${user.uid}-${year}`);
      await deleteDoc(revenueDocRef);

      setMarketingRevenue(prev => {
        const next = { ...prev };
        delete next[year];
        return next;
      });
    } catch (error) {
      console.error('Error clearing yearly revenue:', error);
      throw error;
    }
  };

  const recordRainfall = async (rainfall, year, month) => {
    if (!user) return;

    const yearKey = `year-${year}`;
    const monthKey = `month-${year}-${month}`;

    const newYearTotal = (rainGaugeData[yearKey] || 0) + rainfall;
    const newMonthTotal = (rainGaugeData[monthKey] || 0) + rainfall;

    try {
      // Update yearly total
      const yearDocRef = doc(db, 'rainfall', `${user.uid}-${year}`);
      await setDoc(
        yearDocRef,
        {
          userId: user.uid,
          year,
          total: newYearTotal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update monthly total
      const monthDocRef = doc(db, 'rainfall', `${user.uid}-${year}-${month}`);
      await setDoc(
        monthDocRef,
        {
          userId: user.uid,
          year,
          month,
          total: newMonthTotal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setRainGaugeData(prev => ({
        ...prev,
        [yearKey]: newYearTotal,
        [monthKey]: newMonthTotal,
      }));
    } catch (error) {
      console.error('Error recording rainfall:', error);
    }
  };

  const getRainfallYearlyTotal = year => {
    return rainGaugeData[`year-${year}`] || 0;
  };

  const getRainfallMonthlyTotal = (year, month) => {
    return rainGaugeData[`month-${year}-${month}`] || 0;
  };

  const clearYearRainfall = async year => {
    if (!user) return;
    try {
      // Delete yearly doc
      await deleteDoc(doc(db, 'rainfall', `${user.uid}-${year}`));
      // Delete all monthly docs for that year
      const monthly = await getDocs(
        query(
          collection(db, 'rainfall'),
          where('userId', '==', user.uid),
          where('year', '==', year)
        )
      );
      for (const snap of monthly.docs) {
        await deleteDoc(doc(db, 'rainfall', snap.id));
      }

      setRainGaugeData(prev => {
        const next = { ...prev };
        delete next[`year-${year}`];
        Object.keys(next).forEach(k => {
          if (k.startsWith(`month-${year}-`)) delete next[k];
        });
        return next;
      });
    } catch (error) {
      console.error('Error clearing yearly rainfall:', error);
      throw error;
    }
  };

  const clearMonthRainfall = async (year, month) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'rainfall', `${user.uid}-${year}-${month}`));
      setRainGaugeData(prev => {
        const next = { ...prev };
        delete next[`month-${year}-${month}`];
        return next;
      });
    } catch (error) {
      console.error('Error clearing monthly rainfall:', error);
      throw error;
    }
  };

  const updateUsername = async username => {
    if (!user) return;

    try {
      const nextUsername = (username || '').trim();
      if (!nextUsername) throw new Error('Username is required');
      if (nextUsername.length < 3 || nextUsername.length > 20) {
        throw new Error('Username must be 3-20 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(nextUsername)) {
        throw new Error('Username can only use letters, numbers, and _');
      }

      const nextLower = nextUsername.toLowerCase();

      const existing = await getDocs(
        query(collection(db, 'users'), where('usernameLower', '==', nextLower))
      );

      const takenBySomeoneElse = existing.docs.some(d => d.id !== user.uid);
      if (takenBySomeoneElse) throw new Error('That username is already taken');

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username: nextUsername,
        usernameLower: nextLower,
      });

      setUserProfile(prev => ({
        ...prev,
        username: nextUsername,
      }));
    } catch (error) {
      console.error('Error updating username:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setUser(user);

      if (user) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile({
              uid: user.uid,
              name: userData.name,
              username: userData.username || null,
              email: userData.email,
              zipCode: userData.address?.zipCode || '',
              city: userData.address?.city || '',
              state: userData.address?.state || '',
              region: userData.region || '',
              acresFarmed: userData.acresFarmed || 0,
              banned: !!userData.banned,
              bannedAt:
                userData.bannedAt?.toDate?.() || userData.bannedAt || null,
            });

            // Fetch user's fields
            const fieldsSnapshot = await getDocs(
              query(collection(db, 'fields'), where('userId', '==', user.uid))
            );
            const userFields = fieldsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
            setFields(userFields);

            // Fetch field costs
            const costsSnapshot = await getDocs(
              query(
                collection(db, 'fieldCosts'),
                where('userId', '==', user.uid)
              )
            );
            const costs = {};
            costsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              const key = `${data.fieldId}-${data.year}`;
              costs[key] = data.totalCost || 0;
            });
            setFieldCosts(costs);

            // Fetch marketing revenue
            const revenueSnapshot = await getDocs(
              query(
                collection(db, 'marketingRevenue'),
                where('userId', '==', user.uid)
              )
            );
            const revenue = {};
            revenueSnapshot.docs.forEach(doc => {
              const data = doc.data();
              revenue[data.year] = data.totalRevenue || 0;
            });
            setMarketingRevenue(revenue);

            // Fetch field harvest bushels
            const harvestSnapshot = await getDocs(
              query(
                collection(db, 'fieldHarvestBushels'),
                where('userId', '==', user.uid)
              )
            );
            const harvest = {};
            harvestSnapshot.docs.forEach(docSnap => {
              const data = docSnap.data();
              const key = `${data.fieldId}-${data.year}`;
              harvest[key] = data.totalBushels || 0;
            });
            setFieldHarvestBushels(harvest);

            // Fetch rainfall data
            const rainfallSnapshot = await getDocs(
              query(collection(db, 'rainfall'), where('userId', '==', user.uid))
            );
            const rainfall = {};
            rainfallSnapshot.docs.forEach(doc => {
              const data = doc.data();
              if (data.year) {
                rainfall[`year-${data.year}`] = data.total || 0;
              }
              if (data.year && data.month) {
                rainfall[`month-${data.year}-${data.month}`] = data.total || 0;
              }
            });
            setRainGaugeData(rainfall);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserProfile(null);
        setFields([]);
        setFieldCosts({});
        setFieldHarvestBushels({});
        setMarketingRevenue({});
        setRainGaugeData({});
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        fields,
        addField,
        deleteField,
        clearFieldData,
        recordFieldCost,
        getFieldYearlyTotal,
        getAllFieldsYearlyTotal,
        recordFieldHarvestBushels,
        getFieldHarvestBushelsYearlyTotal,
        fetchFieldHarvestBushelsYearlyTotal,
        recordMarketingRevenue,
        getMarketingRevenueTotal,
        clearYearCosts,
        clearYearRevenue,
        recordRainfall,
        getRainfallYearlyTotal,
        getRainfallMonthlyTotal,
        clearYearRainfall,
        clearMonthRainfall,
        updateUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
