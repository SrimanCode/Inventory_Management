"use client";
import { useState, useEffect } from "react";
import { Firestore, firestore } from "@/firebase";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  Box,
  Modal,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Stack,
} from "@mui/material";
import {
  collection,
  deleteDoc,
  getDocs,
  query,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [file, setFile] = useState(null);

  const storage = getStorage();

  const uploadImage = async (file) => {
    if (!file) return "";
    const storageRef = ref(storage, `images/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, "inventory"));
    const docs = await getDocs(snapshot);
    const inventoryList = [];

    docs.forEach((doc) => {
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      });
    });
    setInventory(inventoryList);
    setFilteredInventory(inventoryList);
  };

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, "inventory"), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity, imageUrl } = docSnap.data();
      if (quantity === 1) {
        await deleteDoc(docRef);

        // Delete the image from Firebase Storage if imageUrl exists
        if (imageUrl) {
          const storage = getStorage();
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef).catch((error) => {
            console.error("Error deleting image:", error);
          });
        }
      } else {
        await setDoc(docRef, { quantity: quantity - 1 }, { merge: true });
      }
      updateInventory();
    }
  };

  const addItem = async (item, file) => {
    const docRef = doc(collection(firestore, "inventory"), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity, imageUrl } = docSnap.data();
      await setDoc(docRef, { quantity: quantity + 1, imageUrl: imageUrl });
    } else {
      let imageUrl = await uploadImage(file);
      await setDoc(docRef, { quantity: 1, imageUrl });
    }
    updateInventory();
  };

  useEffect(() => {
    updateInventory();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = inventory.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredInventory(filtered);
    } else {
      setFilteredInventory(inventory);
    }
  }, [searchQuery, inventory]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleAddItem = async () => {
    if (itemName) {
      await addItem(itemName, file);
      setFile(null);
      setItemName("");
      handleClose();
    }
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      gap={2}
      bgcolor="#f0f0f0"
      p={4}
    >
      <Typography variant="h2">Inventory Management</Typography>
      <TextField
        label="Search Item"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ width: "50%", mb: 2 }}
      />
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Add Item
      </Button>
      <Modal open={open} onClose={handleClose}>
        <Box
          position="absolute"
          top="50%"
          left="50%"
          width={400}
          bgcolor="background.paper"
          boxShadow={24}
          p={4}
          display="flex"
          flexDirection="column"
          gap={3}
          sx={{
            transform: "translate(-50%, -50%)",
          }}
        >
          <Typography variant="h6">Add Item</Typography>
          <TextField
            label="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <input
            accept="image/*"
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <Button variant="outlined" color="primary" onClick={handleAddItem}>
            Add
          </Button>
        </Box>
      </Modal>

      <Stack width="800px" height="500px" spacing={2} overflow="auto">
        {filteredInventory.map((item) => (
          <Grid item xs={12} md={8} key={item.name}>
            <Paper
              elevation={3}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                bgcolor: "#ADD8E6",
              }}
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  style={{ width: "50px", height: "50px" }}
                />
              )}
              <Typography
                variant="body1"
                sx={{ textTransform: "uppercase", fontWeight: "bold" }}
              >
                {item.name}
              </Typography>
              <Typography variant="body1">Quantity: {item.quantity}</Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => addItem(item.name, item.imageUrl)}
                >
                  Add
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => removeItem(item.name)}
                >
                  Remove
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Stack>
    </Box>
  );
}
