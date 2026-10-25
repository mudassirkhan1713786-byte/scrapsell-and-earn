res.json({ ok: true });
});
 found." });
  const allowed = ["Pending", "Contacted", "Purchased", "Cancelled"];
  if (allowed.includes(req.body.status)) item.status = req.body.status;
  writeData(data); res.json({ ok: true });
});
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`ScrapSell & Earn running on port ${PORT}`));