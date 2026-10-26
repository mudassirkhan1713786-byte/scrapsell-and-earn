
    if (
    
    console.error("Rates save error:", error.message);
    res.status(500).json({ error: "Could not save rates" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MudassirEarn running on port ${PORT}`);
});